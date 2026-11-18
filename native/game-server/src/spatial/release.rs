//! Read the operator-selected immutable navigation release before serving a world.

use super::{NavigationMesh, Recast, SpatialError, SpatialProvider};
use openlegend_simulation::{
    encoding::sha256_hex,
    geometry::GeometryMap,
    host::{ByteBudget, ByteReservation},
    state::BodyProfile,
};
use serde::Deserialize;
use std::{
    fmt,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
};

#[derive(Debug)]
pub enum NavigationReleaseError {
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
    Format,
    Hash,
    Spatial(SpatialError),
}
impl fmt::Display for NavigationReleaseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { path, source } => write!(
                f,
                "Unable to read navigation release file {}: {source}",
                path.display()
            ),
            Self::Format => {
                f.write_str("The navigation release has an invalid manifest or file size")
            }
            Self::Hash => f.write_str("The navigation release contents differ from their manifest"),
            Self::Spatial(error) => error.fmt(f),
        }
    }
}
impl std::error::Error for NavigationReleaseError {}
impl From<SpatialError> for NavigationReleaseError {
    fn from(error: SpatialError) -> Self {
        Self::Spatial(error)
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    geometry_sha256: String,
    wasm_sha256: String,
    meshes: Vec<MeshFile>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MeshFile {
    file: String,
    bytes: usize,
    sha256: String,
    body: BodyProfile,
}

struct ReadBytes {
    data: Vec<u8>,
    _funded: ByteReservation,
}

impl SpatialProvider {
    /// Read and verify the checked-in tool's immutable release artifacts. The
    /// exact installed geometry must match before this provider can be used.
    /// Call once during boot or installation replacement, off the I/O runtime.
    pub fn from_release(
        map: &GeometryMap,
        directory: &Path,
        budget: &ByteBudget,
    ) -> Result<Self, NavigationReleaseError> {
        // Fields and paths are finite for the existing six-profile cache.
        let manifest = read(directory, "navigation.json", 16_384, None, budget)?;
        let manifest: Manifest =
            serde_json::from_slice(&manifest.data).map_err(|_| NavigationReleaseError::Format)?;
        if !(1..=6).contains(&manifest.meshes.len()) {
            return Err(NavigationReleaseError::Format);
        }
        let geometry = read(
            directory,
            "geometry.json",
            budget.limit(),
            Some(&manifest.geometry_sha256),
            budget,
        )?;
        // Once per installation, a typed decoded copy checks map identity. It
        // is never retained by the spatial provider or created per question.
        let map_decode = budget
            .reserve(
                geometry
                    .data
                    .len()
                    .checked_mul(16)
                    .ok_or(SpatialError::Capacity)?,
            )
            .map_err(SpatialError::from)?;
        let geometry_map: GeometryMap =
            serde_json::from_slice(&geometry.data).map_err(|_| NavigationReleaseError::Format)?;
        drop(geometry);
        if &geometry_map != map {
            return Err(SpatialError::StaleGeometry.into());
        }
        drop(geometry_map);
        drop(map_decode);
        let wasm = read(
            directory,
            "recast-navigation.wasm",
            338_824,
            Some(&manifest.wasm_sha256),
            budget,
        )?;
        let mut mesh_bytes = Vec::with_capacity(manifest.meshes.len());
        for (i, file) in manifest.meshes.iter().enumerate() {
            if file.file != format!("mesh-{i}.detour") || file.bytes == 0 {
                return Err(NavigationReleaseError::Format);
            }
            let bytes = read(
                directory,
                &file.file,
                file.bytes,
                Some(&file.sha256),
                budget,
            )?;
            if bytes.data.len() != file.bytes {
                return Err(NavigationReleaseError::Format);
            }
            mesh_bytes.push(bytes);
        }
        let meshes = manifest
            .meshes
            .iter()
            .zip(&mesh_bytes)
            .map(|(file, bytes)| NavigationMesh {
                body: &file.body,
                bytes: &bytes.data,
            })
            .collect::<Vec<_>>();
        let mut scene = Self::new(map, budget)?;
        scene.navigation = Some(Mutex::new(Recast::new(&wasm.data, &meshes, budget)?));
        Ok(scene)
    }
}

fn read(
    root: &Path,
    name: &str,
    maximum: usize,
    expected: Option<&str>,
    budget: &ByteBudget,
) -> Result<ReadBytes, NavigationReleaseError> {
    let path = root.join(name);
    let file_error = |source| NavigationReleaseError::Io {
        path: path.clone(),
        source,
    };
    let mut file = File::open(&path).map_err(file_error)?;
    let meta = file.metadata().map_err(file_error)?;
    let size = usize::try_from(meta.len()).map_err(|_| NavigationReleaseError::Format)?;
    if !meta.is_file() || size == 0 || size > maximum {
        return Err(NavigationReleaseError::Format);
    }
    let funded = budget.reserve(size).map_err(SpatialError::from)?;
    let mut data = vec![0; size];
    file.read_exact(&mut data).map_err(file_error)?;
    if file.read(&mut [0]).map_err(file_error)? != 0 {
        return Err(NavigationReleaseError::Format);
    }
    if expected.is_some_and(|value| sha256_hex(&data) != value) {
        return Err(NavigationReleaseError::Hash);
    }
    Ok(ReadBytes {
        data,
        _funded: funded,
    })
}
