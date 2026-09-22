use windows::Win32::Foundation::{CloseHandle, HANDLE};

/// A HANDLE that closes itself.
///
/// The previous code closed handles by hand and missed several error paths,
/// leaking a process or thread handle whenever a launch failed partway.
pub struct OwnedHandle(HANDLE);

impl OwnedHandle {
    /// # Safety
    /// `handle` must be a valid handle that this type may take ownership of.
    pub unsafe fn new(handle: HANDLE) -> Self {
        OwnedHandle(handle)
    }

    pub fn raw(&self) -> HANDLE {
        self.0
    }
}

// A HANDLE is a plain process-wide kernel object reference. Unlike a few GUI
// handles, process, thread and snapshot handles carry no thread affinity, so
// moving one between threads is sound - and Tauri requires command futures to
// be Send, which the raw pointer inside HANDLE would otherwise prevent.
unsafe impl Send for OwnedHandle {}

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}
