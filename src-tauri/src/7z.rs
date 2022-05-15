extern crate rust7z;

use std::ffi::{OsStr, OsString};
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::io::prelude::*;
use std::io::BufWriter;
use std::fs::File;

// ------------------------------------------------------------------------------------------------ //

fn u2w(u8str: &str) -> Vec<u16> {
	OsStr::new(u8str).encode_wide().chain(Some(0).into_iter()).collect::<Vec<_>>()
}

fn w2u(wstr: *const u16) -> String {
    unsafe {
        let len = (0..std::isize::MAX).position(|i| *wstr.offset(i) == 0).unwrap();
        let slice = std::slice::from_raw_parts(wstr, len);
        OsString::from_wide(slice).to_string_lossy().into_owned()
    }
}

// ------------------------------------------------------------------------------------------------ //

#[tauri::command]
#[allow(non_snake_case)]
pub async fn extract7z(path: String, dest: String) -> Result<String, String>{
    unsafe {

		rust7z::init7z();
        
		let k = u2w(&path);
		let file_count = rust7z::open(k.as_ptr()).file_count;
		let mut vec = Vec::new();
        
		for i in 0..file_count {
			let file = rust7z::getFileInfo(i);
			let fname = w2u(file.path);

            if file.size == 0 {
                continue;
            }

			let buf = vec![0; file.size as usize];
			rust7z::extractToBuf(buf.as_ptr(), &i, 1);
			let output = File::create(&(dest.to_owned() + &fname.to_string())).unwrap();
			let mut writer = BufWriter::new(output);
			writer.write(&buf).unwrap();
			writer.flush().unwrap();
			vec.push(i);
		}

		rust7z::close();
        Ok("".into())
	}
}

// ------------------------------------------------------------------------------------------------ //