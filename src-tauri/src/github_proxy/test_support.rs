use super::Settings;
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
    time::{Duration, Instant},
};

pub fn gateway(body: Vec<u8>, expected_path: &str) -> (Settings, thread::JoinHandle<()>) {
    response(
        format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        )
        .into_bytes()
        .into_iter()
        .chain(body)
        .collect(),
        expected_path,
    )
}

pub fn redirect(location: &str, expected_path: &str) -> (Settings, thread::JoinHandle<()>) {
    response(format!("HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").into_bytes(), expected_path)
}

fn response(bytes: Vec<u8>, expected_path: &str) -> (Settings, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let address = listener.local_addr().unwrap();
    let expected_path = expected_path.to_owned();
    let server = thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    stream.set_nonblocking(false).unwrap();
                    stream
                        .set_read_timeout(Some(Duration::from_secs(5)))
                        .unwrap();
                    let mut request = Vec::new();
                    while !request.ends_with(b"\r\n\r\n") {
                        let mut byte = [0];
                        stream.read_exact(&mut byte).unwrap();
                        request.push(byte[0]);
                        assert!(request.len() < 16384);
                    }
                    assert!(String::from_utf8_lossy(&request)
                        .starts_with(&format!("GET {expected_path} HTTP/1.1\r\n")));
                    stream.write_all(&bytes).unwrap();
                    return;
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    assert!(Instant::now() < deadline, "gateway was not contacted");
                    thread::sleep(Duration::from_millis(5));
                }
                Err(error) => panic!("{error}"),
            }
        }
    });
    (
        Settings {
            url: format!("http://{address}/gateway"),
        },
        server,
    )
}
