#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use fnl::{read, Object};
use futures::{stream, StreamExt};
use std::{assert_eq, pin::Pin};
use wasm_bindgen_test::{wasm_bindgen_test_configure, *};

wasm_bindgen_test_configure!(run_in_browser);

macro_rules! test_read {
    ($object:ident, [ $($name:ident: $source:expr => $expected:expr,)* ]) => {
        $(
            #[wasm_bindgen_test]
            async fn $name() {
                let mut stream = stream::iter($source.chars()).peekable();
                let stream = &mut Pin::new(&mut stream);

                let received = read(stream).await;

                match received {
                    Ok(Object::$object(received)) => assert_eq!(received, $expected),
                    _ => panic!("expected a {} object", stringify!($object)),
                }
            }
        )*
    };
}

test_read!(String, [
    read_simple_string:
    r#""read a simple string""# => r#"read a simple string"#,
    read_escaped_string:
    r#""read a \\string\\ with\n\"escaped\" characters""# =>
    r#"read a \string\ with
"escaped" characters"#,
]);

test_read!(Number, [
    read_zero: r#"0"# => 0_f64,
    read_positive_integer: r#"314"# => 314_f64,
    read_negative_integer: r#"-314"# => -314_f64,
    read_positive_float: r#"3.14"# => 3.14_f64,
    read_negative_float: r#"-3.14"# => -3.14_f64,
]);
