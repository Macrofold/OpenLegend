//! The serve-process owner of optional profiling. The operator command pipe
//! and export belong to a dedicated thread. No request can arm the recorder.

mod record;

use openlegend_simulation::profile::{self, Link, Observer, Outcome, Site};
use record::{Capture, MAX_EXACT, Window};
use serde::Deserialize;
use std::{
    fs::{File, OpenOptions},
    io::{self, BufRead, BufWriter, Write},
    path::Path,
    sync::{
        Mutex, OnceLock, TryLockError,
        atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering},
    },
    time::Instant,
};

const MAX_COMMAND: u64 = 8192;
const PREFIX: &str = "OpenLegend profile ";

struct Recorder {
    origin: Instant,
    capture: Mutex<Option<Capture>>,
    generation: AtomicU32,
    selected: AtomicU64,
    // Upper half identifies the only generation allowed to increment losses.
    losses: AtomicU64,
    closed: AtomicBool,
}

static RECORDER: OnceLock<Recorder> = OnceLock::new();

impl Recorder {
    fn new() -> Self {
        Self {
            origin: Instant::now(),
            capture: Mutex::new(None),
            generation: AtomicU32::new(0),
            selected: AtomicU64::new(0),
            losses: AtomicU64::new(0),
            closed: AtomicBool::new(false),
        }
    }

    fn now(&self) -> u64 {
        self.origin.elapsed().as_nanos().min(u128::from(MAX_EXACT)) as u64
    }

    fn lose(&self, generation: u32) {
        let _ = self
            .losses
            .try_update(Ordering::AcqRel, Ordering::Relaxed, |state| {
                (generation != 0 && (state >> 32) as u32 == generation && (state as u32) < u32::MAX)
                    .then(|| state + 1)
            });
    }

    fn record<T>(
        &self,
        generation: u32,
        update: impl FnOnce(&mut Capture, u64) -> Option<T>,
    ) -> Option<T> {
        if generation == 0 || self.generation.load(Ordering::Acquire) != generation {
            return None;
        }
        let mut capture = match self.capture.try_lock() {
            Ok(capture) => capture,
            Err(TryLockError::WouldBlock) => {
                self.lose(generation);
                return None;
            }
            Err(TryLockError::Poisoned(_)) => {
                self.lose(generation);
                self.selected.store(0, Ordering::Release);
                return None;
            }
        };
        let capture = capture
            .as_mut()
            .filter(|capture| capture.generation == generation)?;
        let update = update(capture, self.now());
        if update.is_none() {
            self.lose(generation);
        }
        update
    }

    fn arm(&self, capture: Capture, mask: u64) -> Result<(), &'static str> {
        let mut slot = self.capture.lock().map_err(|_| "recorder storage failed")?;
        if self.closed.load(Ordering::Acquire) {
            return Err("the profiling operator has closed");
        }
        if slot.is_some() {
            return Err("a capture is already armed");
        }
        if !openlegend_world_host::prepare_profile_dispatch() {
            return Err("could not reserve dispatch observations");
        }
        let generation = capture.generation;
        *slot = Some(capture);
        self.losses
            .store(u64::from(generation) << 32, Ordering::Release);
        self.generation.store(generation, Ordering::Release);
        self.selected.store(mask, Ordering::Release);
        Ok(())
    }

    fn detach(&self) -> Option<Capture> {
        let capture = {
            let mut slot = self
                .capture
                .lock()
                .unwrap_or_else(|error| error.into_inner());
            self.selected.store(0, Ordering::Release);
            self.generation.store(0, Ordering::Release);
            let mut capture = slot.take()?;
            capture.lost = u64::from(self.losses.swap(0, Ordering::AcqRel) as u32);
            capture
        };
        openlegend_world_host::clear_profile_dispatch();
        Some(capture)
    }
}

impl Observer for Recorder {
    fn selected(&self, site: Site) -> bool {
        self.selected.load(Ordering::Acquire) & site.mask() != 0
    }

    fn live(&self, link: Link) -> bool {
        self.generation.load(Ordering::Acquire) == link.generation()
    }

    fn begin(&self, site: Site, parent: Option<Link>) -> Option<Link> {
        if !self.selected(site) {
            return None;
        }
        self.record(self.generation.load(Ordering::Acquire), |capture, now| {
            capture.begin(now, site, parent)
        })
        .flatten()
    }

    fn resume(&self, link: Link, lane: u32, active_parent: Option<Link>) -> bool {
        self.record(link.generation(), |capture, now| {
            capture.resume(now, link, lane, active_parent)
        })
        .unwrap_or(false)
    }

    fn suspend(&self, link: Link, lane: u32) {
        self.record(link.generation(), |capture, now| {
            capture.suspend(now, link, lane)
        });
    }

    fn end(&self, link: Link, outcome: Outcome, work: Option<u64>) {
        self.record(link.generation(), |capture, now| {
            capture.end(now, link, outcome, work)
        });
    }

    fn count(&self, site: Site, value: u64) {
        self.record(self.generation.load(Ordering::Acquire), |capture, now| {
            capture.count(now, site, value)
        });
    }

    fn omitted(&self, site: Site) {
        if self.selected(site) {
            self.lose(self.generation.load(Ordering::Acquire));
        }
    }
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
enum Command {
    Ping {
        id: u32,
    },
    Arm {
        sites: Vec<String>,
        #[serde(rename = "startNs")]
        start_ns: u64,
        #[serde(rename = "endNs")]
        end_ns: u64,
        #[serde(rename = "drainNs")]
        drain_ns: u64,
        seed: u64,
        every: u8,
        #[serde(rename = "traceBytes", default)]
        trace_bytes: usize,
    },
    Stop {},
}

pub(crate) struct Operator {
    recorder: &'static Recorder,
}

impl Drop for Operator {
    fn drop(&mut self) {
        self.recorder.closed.store(true, Ordering::Release);
        self.recorder.detach();
    }
}

pub(crate) fn start_from_operator() -> Option<Operator> {
    let mode = std::env::var_os("OPEN_LEGEND_PROFILE_CONTROL")?;
    if mode != "stdin" {
        notify_error("unsupported operator profiling transport");
        return None;
    }
    match start() {
        Ok(operator) => Some(operator),
        Err(error) => {
            notify_error(error);
            None
        }
    }
}

fn start() -> Result<Operator, &'static str> {
    let path = std::env::var_os("OPEN_LEGEND_PROFILE_OUTPUT")
        .ok_or("no private capture output path was supplied")?;
    let path = Path::new(&path);
    if !path.is_absolute() {
        return Err("capture output path must be absolute");
    }
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let output = options
        .open(path)
        .map_err(|_| "could not create a new private capture export")?;
    let recorder = RECORDER.get_or_init(Recorder::new);
    if !profile::install(recorder) {
        return Err("a profiling operator is already connected");
    }
    std::thread::Builder::new()
        .name("openlegend-profile-operator".into())
        .spawn(move || {
            if let Err(error) = commands(recorder, output) {
                recorder.detach();
                notify_error(error);
            }
        })
        .map_err(|_| "could not start the operator control thread")?;
    Ok(Operator { recorder })
}

fn commands(recorder: &'static Recorder, output: File) -> Result<(), &'static str> {
    let mut input = io::stdin().lock();
    let mut output = BufWriter::new(output);
    let mut generation = 0u32;
    while let Some(command) = next(&mut input)? {
        match command {
            Command::Ping { id } => {
                notify(&serde_json::json!({ "type": "pong", "id": id, "nowNs": recorder.now() }))?;
            }
            Command::Arm {
                sites,
                start_ns,
                end_ns,
                drain_ns,
                seed,
                every,
                trace_bytes,
            } => {
                if !(recorder.now() < start_ns
                    && start_ns < end_ns
                    && end_ns <= drain_ns
                    && drain_ns <= MAX_EXACT)
                {
                    return Err("capture clock window is invalid or has already started");
                }
                generation = generation
                    .checked_add(1)
                    .ok_or("capture generation exhausted")?;
                let window = Window {
                    start_ns,
                    end_ns,
                    drain_ns,
                    stop_ns: 0,
                    complete: false,
                };
                let (capture, mask) =
                    Capture::arm(generation, &sites, window, seed, every, trace_bytes)?;
                if recorder.now() >= start_ns {
                    return Err("arming overran the capture start");
                }
                recorder.arm(capture, mask)?;
                notify(&serde_json::json!({ "type": "armed", "generation": generation }))?;
            }
            Command::Stop {} => {
                let mut capture = recorder.detach().ok_or("no capture is armed")?;
                let complete = capture.stop(recorder.now());
                serde_json::to_writer(&mut output, &capture)
                    .map_err(|_| "capture export failed")?;
                output
                    .write_all(b"\n")
                    .and_then(|()| output.flush())
                    .map_err(|_| "capture export failed")?;
                notify(
                    &serde_json::json!({ "type": "stopped", "generation": generation, "complete": complete }),
                )?;
            }
        }
    }
    if recorder.detach().is_some() {
        return Err("operator pipe closed with an armed capture");
    }
    Ok(())
}

fn next(input: &mut impl BufRead) -> Result<Option<Command>, &'static str> {
    use std::io::Read;
    let mut line = Vec::new();
    let received = input
        .take(MAX_COMMAND + 1)
        .read_until(b'\n', &mut line)
        .map_err(|_| "operator command read failed")?;
    if received == 0 {
        return Ok(None);
    }
    if received as u64 > MAX_COMMAND || line.last() != Some(&b'\n') {
        return Err("operator command exceeds the line allowance or is incomplete");
    }
    serde_json::from_slice(&line)
        .map(Some)
        .map_err(|_| "invalid operator command")
}

fn notify(value: &serde_json::Value) -> Result<(), &'static str> {
    let mut output = io::stdout().lock();
    writeln!(output, "{PREFIX}{value}")
        .and_then(|()| output.flush())
        .map_err(|_| "operator response pipe failed")
}

fn notify_error(reason: &'static str) {
    let _ = notify(&serde_json::json!({ "type": "error", "reason": reason }));
}
