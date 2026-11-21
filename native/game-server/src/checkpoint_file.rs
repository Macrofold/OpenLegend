//! Internal helper process. The server selects and funds the records and
//! holds their database snapshot. This process can be stopped and joined if
//! a filesystem operation stalls before a complete package is published.

use std::fs::{self, DirBuilder, File, OpenOptions};
use std::io::{self, BufWriter, Read, Write};
use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt};
use std::path::Path;
use uuid::Uuid;

const FILE_BUFFER: usize = 64 * 1024;

pub(super) fn write(root: &Path, id: &str, nonce: &str) -> io::Result<()> {
    if [id, nonce]
        .iter()
        .any(|value| value.len() != 36 || Uuid::parse_str(value).is_err())
    {
        return Err(io::ErrorKind::InvalidInput.into());
    }
    DirBuilder::new().recursive(true).mode(0o700).create(root)?;
    let stage = root.join(format!(".pending-{nonce}"));
    DirBuilder::new().mode(0o700).create(&stage)?;
    let mut input = io::stdin().lock();
    let mut scratch = vec![0; FILE_BUFFER];
    let mut file = BufWriter::with_capacity(FILE_BUFFER, open_private(&stage.join("world.jsonl"))?);
    let mut frame = [0; 4];
    loop {
        input.read_exact(&mut frame)?;
        let mut bytes = u32::from_be_bytes(frame) as usize;
        if bytes == 0 {
            break;
        }
        while bytes != 0 {
            let chunk = bytes.min(scratch.len());
            input.read_exact(&mut scratch[..chunk])?;
            file.write_all(&scratch[..chunk])?;
            bytes -= chunk;
        }
    }
    file.flush()?;
    file.get_ref().sync_all()?;
    input.read_exact(&mut frame)?;
    let bytes = u32::from_be_bytes(frame) as usize;
    if bytes == 0 || bytes > scratch.len() {
        return Err(io::ErrorKind::InvalidData.into());
    }
    input.read_exact(&mut scratch[..bytes])?;
    if input.read(&mut frame)? != 0 {
        return Err(io::ErrorKind::InvalidData.into());
    }
    let mut metadata = open_private(&stage.join("metadata.json"))?;
    metadata.write_all(&scratch[..bytes])?;
    metadata.sync_all()?;
    File::open(&stage)?.sync_all()?;
    fs::rename(&stage, root.join(id))?;
    File::open(root)?.sync_all()
}

fn open_private(path: &Path) -> io::Result<File> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(path)
}
