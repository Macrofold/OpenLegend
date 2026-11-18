//! Node-free calls into the exact pinned Detour artifact. The existing tiled
//! Recast generator prepares meshes at build time for the installed map/body
//! profiles. This binding keeps that backend's 32-bit references and f32 math.

use super::SpatialError;
use openlegend_simulation::{
    encoding::sha256_hex,
    host::{ByteBudget, ByteReservation, ResidentReservation},
    state::{BodyProfile, Point},
};
use std::{collections::HashMap, mem::size_of};
use wasmi::{
    Caller, Engine, Instance, Linker, Memory, Module, ResourceLimiter, Store, WasmParams,
    WasmResults,
    errors::{LimiterError, MemoryError},
};

const MODULE: &str = "008696e1a67df34aa3c830417a520034a2a358c838fc631084681f7f8f1f7a38";
const PAGE: usize = 65_536;
const OUT_OF_NODES: i32 = 1 << 5;
const BUFFER_TOO_SMALL: i32 = 1 << 4;
const PARTIAL: i32 = 1 << 6;
const SUCCESS: i32 = 1 << 30;
pub(super) const MAX_PATH: usize = 2048;
pub(super) const SEARCH_NODES: usize = 4096;

/// Prepared at build time by the pinned Recast generator. The caller verifies
/// these exact bytes and map binding through the trusted release manifest.
pub(super) struct NavigationMesh<'a> {
    pub body: &'a BodyProfile,
    pub bytes: &'a [u8],
}

#[derive(Clone, Copy, Hash, Eq, PartialEq)]
struct BodyKey([u64; 3]);
impl From<&BodyProfile> for BodyKey {
    fn from(b: &BodyProfile) -> Self {
        Self([b.radius, b.height, b.max_slope].map(f64::to_bits))
    }
}

#[derive(Clone, Copy)]
pub(super) struct Location {
    poly: i32,
    pub point: Point,
}
#[derive(Clone, Copy)]
pub(super) struct Mesh {
    mesh: i32,
    query: i32,
}

pub(super) enum Search<T> {
    Found(T),
    Budget,
    Missing,
}

// Export names in this file are from the installed package's
// recast-navigation.wasm.js. They are specific to MODULE; other artifacts
// refuse before instantiation. Only the native query functions are exposed.
struct Runtime {
    store: Store<MemoryAdmission>,
    instance: Instance,
    memory: Memory,
    _module: ResidentReservation,
    poisoned: bool,
}

struct MemoryAdmission {
    resident: ResidentReservation,
    workspace: ByteReservation,
    denied: bool,
}
impl MemoryAdmission {
    fn settle(&mut self, bytes: usize) -> Result<(), SpatialError> {
        self.resident.resize(bytes)?;
        self.workspace.resize(0)?;
        Ok(())
    }
}
impl ResourceLimiter for MemoryAdmission {
    fn memory_growing(
        &mut self,
        current: usize,
        desired: usize,
        maximum: Option<usize>,
    ) -> Result<bool, LimiterError> {
        if maximum.is_some_and(|max| desired > max) {
            return Ok(false);
        }
        // The prior backing stays resident until Wasmi finishes growing it.
        // Admit the entire replacement because it can allocate before freeing.
        if desired > current && self.workspace.resize(desired).is_err() {
            self.denied = true;
            return Ok(false);
        }
        Ok(true)
    }
    fn memory_grow_failed(&mut self, _: &MemoryError) -> Result<(), LimiterError> {
        let _ = self.workspace.resize(0);
        Ok(())
    }
    fn table_growing(
        &mut self,
        _: usize,
        desired: usize,
        _: Option<usize>,
    ) -> Result<bool, LimiterError> {
        // The pinned module declares 106 entries, with no declared maximum.
        // Its fixed Detour calls never register callbacks or grow the table.
        Ok(desired <= 106)
    }
    fn instances(&self) -> usize {
        1
    }
    fn tables(&self) -> usize {
        1
    }
    fn memories(&self) -> usize {
        1
    }
}

impl Runtime {
    fn new(module: &[u8], budget: &ByteBudget) -> Result<Self, SpatialError> {
        if sha256_hex(module) != MODULE {
            return Err(SpatialError::InvalidMap);
        }
        // Translation retains bytecode, type/index tables and temporary
        // validation. Only this authenticated build product reaches Wasmi.
        let translation = budget.reserve(module.len() * 16)?;
        let engine = Engine::default();
        let wasm = Module::new(&engine, module).map_err(|_| SpatialError::InvalidMap)?;
        let module_bytes = budget.resident().reserve(translation.bytes())?;
        drop(translation);
        let mut store = Store::new(
            &engine,
            MemoryAdmission {
                resident: budget.resident().reserve(0)?,
                workspace: budget.reserve(0)?,
                denied: false,
            },
        );
        store.limiter(|state| state);
        let mut linker = Linker::new(&engine);
        linker
            .func_wrap(
                "a",
                "a",
                |_: i32, _: i32, _: i32| -> Result<i32, wasmi::Error> {
                    Err(wasmi::Error::new("Recast callback is unavailable"))
                },
            )
            .map_err(|_| SpatialError::InvalidMap)?;
        linker
            .func_wrap("a", "b", |n: i32| -> Result<(), wasmi::Error> {
                Err(wasmi::Error::i32_exit(n))
            })
            .map_err(|_| SpatialError::InvalidMap)?;
        linker
            .func_wrap("a", "c", || {})
            .map_err(|_| SpatialError::InvalidMap)?;
        linker
            .func_wrap("a", "d", |_: i32, _: f64| -> Result<i32, wasmi::Error> {
                Err(wasmi::Error::new("Recast timer is unavailable"))
            })
            .map_err(|_| SpatialError::InvalidMap)?;
        linker
            .func_wrap("a", "e", || -> Result<(), wasmi::Error> {
                Err(wasmi::Error::new("Recast aborted"))
            })
            .map_err(|_| SpatialError::InvalidMap)?;
        linker
            .func_wrap("a", "f", resize_heap)
            .map_err(|_| SpatialError::InvalidMap)?;
        let instance = linker
            .instantiate_and_start(&mut store, &wasm)
            .map_err(|_| {
                if store.data().denied {
                    SpatialError::Capacity
                } else {
                    SpatialError::InvalidMap
                }
            })?;
        let memory = instance
            .get_memory(&store, "g")
            .ok_or(SpatialError::InvalidMap)?;
        let mut runtime = Self {
            store,
            instance,
            memory,
            _module: module_bytes,
            poisoned: false,
        };
        runtime.call::<_, ()>("h", ())?;
        Ok(runtime)
    }

    fn call<P: WasmParams, R: WasmResults>(
        &mut self,
        export: &str,
        args: P,
    ) -> Result<R, SpatialError> {
        let function = self
            .instance
            .get_typed_func::<P, R>(&self.store, export)
            .map_err(|_| SpatialError::InvalidMap)?;
        if self.poisoned {
            return Err(SpatialError::NavigationUnavailable);
        }
        self.store.data_mut().denied = false;
        let result = function.call(&mut self.store, args);
        self.poisoned = result.is_err();
        let bytes = self.memory.data_size(&self.store);
        self.store.data_mut().settle(bytes)?;
        result.map_err(|_| {
            if self.store.data().denied {
                SpatialError::Capacity
            } else {
                SpatialError::NavigationUnavailable
            }
        })
    }
    fn pointer<P: WasmParams>(&mut self, name: &str, args: P) -> Result<i32, SpatialError> {
        let pointer = self.call::<_, i32>(name, args)?;
        if pointer > 0 {
            Ok(pointer)
        } else if self.store.data().denied {
            Err(SpatialError::Capacity)
        } else {
            Err(SpatialError::NavigationUnavailable)
        }
    }
    fn coordinates(&mut self, pointer: i32, p: Point) -> Result<(), SpatialError> {
        let mut bytes = [0; 12];
        for (at, value) in [p.x, p.y, p.z].into_iter().enumerate() {
            bytes[at * 4..at * 4 + 4].copy_from_slice(&(value as f32).to_le_bytes());
        }
        self.memory
            .write(&mut self.store, pointer as usize, &bytes)
            .map_err(|_| SpatialError::InvalidQuery)
    }
    fn read(&self, pointer: i32, count: usize) -> Result<&[u8], SpatialError> {
        let at = usize::try_from(pointer).map_err(|_| SpatialError::InvalidQuery)?;
        let end = at.checked_add(count).ok_or(SpatialError::InvalidQuery)?;
        self.memory
            .data(&self.store)
            .get(at..end)
            .ok_or(SpatialError::InvalidQuery)
    }
    fn load_mesh(&mut self, data: &[u8]) -> Result<Mesh, SpatialError> {
        let len = i32::try_from(data.len()).map_err(|_| SpatialError::Capacity)?;
        if len == 0 {
            return Err(SpatialError::InvalidMap);
        }
        let input = self.pointer("k", len)?;
        self.memory
            .write(&mut self.store, input as usize, data)
            .map_err(|_| SpatialError::InvalidMap)?;
        let source = self.pointer("nt", ())?;
        self.call::<_, ()>("pt", (source, input))?;
        self.call::<_, ()>("rt", (source, len))?;
        let importer = self.pointer("kt", ())?;
        let result = self.pointer("lt", (importer, source, 0_i32))?;
        let mesh = self.pointer("bt", result)?;
        self.call::<_, ()>("jt", result)?;
        self.call::<_, ()>("mt", importer)?;
        self.call::<_, ()>("st", source)?;
        self.call::<_, ()>("i", input)?;
        let query = self.pointer("Pj", ())?;
        let status: i32 = self.call("Rj", (query, mesh, SEARCH_NODES as i32))?;
        if status & SUCCESS == 0 {
            return Err(SpatialError::InvalidMap);
        }
        Ok(Mesh { mesh, query })
    }
}

fn resize_heap(mut caller: Caller<'_, MemoryAdmission>, requested: i32) -> i32 {
    let Some(memory) = caller
        .get_export("g")
        .and_then(|export| export.into_memory())
    else {
        return 0;
    };
    let before = memory.data_size(&caller);
    let requested = requested as u32 as usize;
    // Match Emscripten's actual growth ladder. A smaller growth can still fit
    // the host allowance if the first overallocated request is too large.
    let max = 2_147_483_648;
    for cut in [1.0, 2.0, 4.0] {
        let extra =
            ((before as f64) * (1.0 + 0.2 / cut)).min(requested as f64 + 100_663_296.0) as usize;
        let goal = requested.max(extra).next_multiple_of(PAGE).min(max);
        if goal >= requested
            && goal > before
            && memory
                .grow(&mut caller, ((goal - before) / PAGE) as u64)
                .is_ok()
        {
            // Settle here so a second growth during the same query sees the
            // real retained backing in resident accounting.
            if caller.data_mut().settle(goal).is_err() {
                return 0;
            }
            caller.data_mut().denied = false;
            return 1;
        }
    }
    0
}

pub(super) struct Recast {
    runtime: Runtime,
    meshes: HashMap<BodyKey, Mesh>,
    filter: i32,
    vector: i32,
    a: i32,
    b: i32,
    poly_ref: i32,
    over: i32,
    corridor: i32,
    vertex_array: i32,
    flags: i32,
    refs: i32,
    count: i32,
    around: i32,
    parents: i32,
    costs: i32,
}
impl Recast {
    pub(super) fn new(
        module: &[u8],
        meshes: &[NavigationMesh<'_>],
        budget: &ByteBudget,
    ) -> Result<Self, SpatialError> {
        // Preserve the current planner's six-profile resident bound.
        if meshes.is_empty() || meshes.len() > 6 {
            return Err(SpatialError::InvalidMap);
        }
        let mut runtime = Runtime::new(module, budget)?;
        let mut catalog = HashMap::new();
        for artifact in meshes {
            let key = BodyKey::from(artifact.body);
            if catalog.contains_key(&key) {
                return Err(SpatialError::InvalidMap);
            }
            catalog.insert(key, runtime.load_mesh(artifact.bytes)?);
        }
        let filter = runtime.pointer("En", ())?;
        runtime.call::<_, ()>("In", (filter, 65535_i32))?;
        runtime.call::<_, ()>("Kn", (filter, 0_i32))?;
        Ok(Self {
            meshes: catalog,
            filter,
            vector: runtime.pointer("di", ())?,
            a: runtime.pointer("k", 12_i32)?,
            b: runtime.pointer("k", 12_i32)?,
            poly_ref: runtime.pointer("xr", ())?,
            over: runtime.pointer("pr", ())?,
            corridor: runtime.pointer("$r", ())?,
            vertex_array: runtime.pointer("Ps", ())?,
            flags: runtime.pointer("ns", ())?,
            refs: runtime.pointer("$r", ())?,
            count: runtime.pointer("tr", ())?,
            around: runtime.pointer("$r", ())?,
            parents: runtime.pointer("$r", ())?,
            costs: runtime.pointer("Ps", ())?,
            runtime,
        })
    }
    pub(super) fn mesh(&self, body: &BodyProfile) -> Result<Mesh, SpatialError> {
        if self.runtime.poisoned {
            return Err(SpatialError::NavigationUnavailable);
        }
        self.meshes
            .get(&body.into())
            .copied()
            .ok_or(SpatialError::NavigationUnavailable)
    }
    pub(super) fn nearest(
        &mut self,
        mesh: Mesh,
        p: Point,
    ) -> Result<Option<Location>, SpatialError> {
        let rt = &mut self.runtime;
        rt.coordinates(self.a, p)?;
        rt.coordinates(
            self.b,
            Point {
                x: 0.3,
                y: 0.2,
                z: 0.3,
            },
        )?;
        let status: i32 = rt.call(
            "Wj",
            (
                mesh.query,
                self.a,
                self.b,
                self.filter,
                self.poly_ref,
                self.vector,
                self.over,
            ),
        )?;
        let poly: i32 = rt.call("yr", self.poly_ref)?;
        if (status & SUCCESS) == 0 || poly == 0 {
            return Ok(None);
        }
        let [x, y, z] = ["fi", "hi", "ji"].map(|f| rt.call::<_, f32>(f, self.vector));
        Ok(Some(Location {
            poly,
            point: Point {
                x: f64::from(x?),
                y: f64::from(y?),
                z: f64::from(z?),
            },
        }))
    }
    pub(super) fn path(
        &mut self,
        mesh: Mesh,
        from: Location,
        to: Location,
    ) -> Result<Search<Vec<Point>>, SpatialError> {
        let rt = &mut self.runtime;
        let cap = MAX_PATH as i32;
        rt.coordinates(self.a, from.point)?;
        rt.coordinates(self.b, to.point)?;
        rt.call::<_, ()>("as", (self.corridor, cap))?;
        let status: i32 = rt.call(
            "Sj",
            (
                mesh.query,
                from.poly,
                to.poly,
                self.a,
                self.b,
                self.filter,
                self.corridor,
                cap,
            ),
        )?;
        if status & (OUT_OF_NODES | BUFFER_TOO_SMALL) != 0 {
            return Ok(Search::Budget);
        }
        if status & SUCCESS == 0 || status & PARTIAL != 0 {
            return Ok(Search::Missing);
        }
        let len: i32 = rt.call("is", self.corridor)?;
        if len == 0 || len > cap {
            return Ok(Search::Missing);
        }
        let pointer = rt.pointer("fs", self.corridor)?;
        let last = i32::from_le_bytes(
            rt.read(pointer + (len - 1) * 4, 4)?
                .try_into()
                .expect("four bytes"),
        );
        if last != to.poly {
            return Ok(Search::Missing);
        }
        rt.call::<_, ()>("Qs", (self.vertex_array, cap * 3))?;
        rt.call::<_, ()>("os", (self.flags, cap))?;
        rt.call::<_, ()>("as", (self.refs, cap))?;
        let status: i32 = rt.call(
            "Vj",
            (
                mesh.query,
                self.a,
                self.b,
                self.corridor,
                self.vertex_array,
                self.flags,
                self.refs,
                self.count,
                cap,
                2_i32,
            ),
        )?;
        if status & SUCCESS == 0 || status & BUFFER_TOO_SMALL != 0 {
            return Ok(Search::Budget);
        }
        let count: i32 = rt.call("ur", self.count)?;
        if !(0..=cap).contains(&count) {
            return Err(SpatialError::InvalidQuery);
        }
        let data = rt.pointer("Vs", self.vertex_array)?;
        let raw = rt.read(data, count as usize * 3 * size_of::<f32>())?;
        let points = raw
            .chunks_exact(12)
            .map(|bytes| {
                let [x, y, z] = std::array::from_fn(|i| {
                    f64::from(f32::from_le_bytes(
                        bytes[i * 4..i * 4 + 4].try_into().expect("four bytes"),
                    ))
                });
                Point { x, y, z }
            })
            .collect();
        Ok(Search::Found(points))
    }
    pub(super) fn around(
        &mut self,
        mesh: Mesh,
        from: Location,
        radius: f64,
    ) -> Result<Search<Vec<i32>>, SpatialError> {
        let rt = &mut self.runtime;
        let cap = SEARCH_NODES as i32;
        rt.coordinates(self.a, from.point)?;
        for array in [self.around, self.parents] {
            rt.call::<_, ()>("as", (array, cap))?;
        }
        rt.call::<_, ()>("Qs", (self.costs, cap))?;
        let status: i32 = rt.call(
            "Xj",
            (
                mesh.query,
                from.poly,
                self.a,
                radius as f32,
                self.filter,
                self.around,
                self.parents,
                self.costs,
                self.count,
                cap,
            ),
        )?;
        if status & (OUT_OF_NODES | BUFFER_TOO_SMALL) != 0 {
            return Ok(Search::Budget);
        }
        if status & SUCCESS == 0 {
            return Ok(Search::Missing);
        }
        let count: i32 = rt.call("ur", self.count)?;
        if !(0..=cap).contains(&count) {
            return Err(SpatialError::InvalidQuery);
        }
        let pointer = rt.pointer("fs", self.around)?;
        let refs = rt
            .read(pointer, count as usize * size_of::<i32>())?
            .chunks_exact(4)
            .map(|word| i32::from_le_bytes(word.try_into().expect("four bytes")))
            .collect();
        Ok(Search::Found(refs))
    }
    pub(super) fn vertices(
        &mut self,
        mesh: Mesh,
        reference: i32,
    ) -> Result<Vec<Point>, SpatialError> {
        let rt = &mut self.runtime;
        let result = rt.pointer("fj", (mesh.mesh, reference))?;
        let status: i32 = rt.call("Ci", result)?;
        if status & SUCCESS == 0 {
            rt.call::<_, ()>("Ii", result)?;
            return Err(SpatialError::NavigationUnavailable);
        }
        let tile = rt.pointer("Ei", result)?;
        let poly = rt.pointer("Gi", result)?;
        let count: i32 = rt.call("sb", poly)?;
        if !(3..=6).contains(&count) {
            return Err(SpatialError::InvalidQuery);
        }
        let mut vertices = Vec::with_capacity(count as usize);
        for i in 0..count {
            let index: i32 = rt.call("mb", (poly, i))?;
            let offset = index * 3;
            let [x, y, z] =
                [offset, offset + 1, offset + 2].map(|at| rt.call::<_, f32>("tc", (tile, at)));
            vertices.push(Point {
                x: f64::from(x?),
                y: f64::from(y?),
                z: f64::from(z?),
            });
        }
        rt.call::<_, ()>("Ii", result)?;
        Ok(vertices)
    }
}
