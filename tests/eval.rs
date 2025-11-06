#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use fnl::{eval, read, Object};
use futures::{stream, StreamExt};
use std::{assert_eq, pin::Pin};
use wasm_bindgen_test::{wasm_bindgen_test_configure, *};

wasm_bindgen_test_configure!(run_in_browser);

macro_rules! test_eval {
    ($object:ident, $ty:ty, [ $($name:ident: $source:expr => $expected:expr,)* ]) => {
        $(
            #[wasm_bindgen_test]
            async fn $name() {
                let mut stream = stream::iter($source.chars()).peekable();
                let stream = &mut Pin::new(&mut stream);

                let reads = match read(stream).await {
                    Ok(res) => res,
                    _ => panic!("expected a readable expression"),
                };

                let evals = eval(reads).await;

                match evals {
                    Ok(Object::$object(received)) => assert_eq!(received, Into::<$ty>::into($expected)),
                    _ => panic!("expected a {} object", stringify!($object)),
                };
            }
        )*
    };
}

test_eval!(String, String, [
    evaluate_string:
    r#""str""# => "str",
]);

test_eval!(Number, f64, [
    evaluate_number:
    r#"1.0"# => 1.0,
]);

test_eval!(Boolean, bool, [
    evaluate_true:
    r#"true"# => true,

    evaluate_false:
    r#"false"# => false,
]);

test_eval!(Nil, (), [
    evaluate_nil:
    r#""# => (),

    evaluate_nil_symbol:
    r#"nil"# => (),
]);
