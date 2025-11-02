#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use fnl::{read, Object};
use futures::{stream, StreamExt};
use std::{assert_eq, pin::Pin};
use wasm_bindgen_test::{wasm_bindgen_test_configure, *};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
async fn read_simple_string() {
    let source = r#"
        "read a simple string"
    "#;

    let mut stream = stream::iter(source.chars()).peekable();
    let stream = Pin::new(&mut stream);

    let received = read(stream).await;
    let expected = String::from("read a simple string");

    match received {
        Ok(Object::String(received)) => assert_eq!(received, expected),
        _ => panic!("expected a string object"),
    }
}

#[wasm_bindgen_test]
async fn read_escaped_string() {
    let source = r#"
        "read a \\string\\ with\n\"escaped\" characters"
    "#;

    let mut stream = stream::iter(source.chars()).peekable();
    let stream = Pin::new(&mut stream);

    let received = read(stream).await;
    let expected = String::from(
        r#"read a \string\ with
"escaped" characters"#,
    );

    match received {
        Ok(Object::String(received)) => assert_eq!(received, expected),
        _ => panic!("expected a string object"),
    }
}
