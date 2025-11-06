#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use fnl::{read, Object, ParseError};
use futures::{stream, StreamExt};
use std::{assert_eq, pin::Pin};
use wasm_bindgen_test::{wasm_bindgen_test_configure, *};

wasm_bindgen_test_configure!(run_in_browser);

macro_rules! test_read {
    ($object:ident, $ty:ty, [ $($name:ident: $source:expr => $expected:expr,)* ]) => {
        $(
            #[wasm_bindgen_test]
            async fn $name() {
                let mut stream = stream::iter($source.chars()).peekable();
                let stream = &mut Pin::new(&mut stream);

                let received = read(stream).await;

                match received {
                    Ok(Object::$object(received)) => assert_eq!(received, Into::<$ty>::into($expected)),
                    _ => panic!("expected a {} object", stringify!($object)),
                };
            }
        )*
    };
}

macro_rules! test_fail {
    ($object:ident, [ $($name:ident: $source:expr => $message:expr,)* ]) => {
        $(
            #[wasm_bindgen_test]
            async fn $name() {
                let mut stream = stream::iter($source.chars()).peekable();
                let stream = &mut Pin::new(&mut stream);

                let received = read(stream).await;

                match received {
                    Ok(_) => panic!("expected an error"),
                    Err(ParseError(message)) => assert_eq!(message, $message),
                };
            }
        )*
    };
}

test_read!(String, String, [
    read_simple_string:
    r#""read a simple string""# => r#"read a simple string"#,

    read_escaped_string:
    r#""read a \\string\\ with\n\"escaped\" characters""# => r#"read a \string\ with
"escaped" characters"#,
]);

test_fail!(String, [
    fail_on_unterminated_string:
    r#""unterminated string"# => "Unterminated string",

    fail_on_invalid_escape:
    r#""invalid \escape""# => "Invalid escape character",
]);

test_read!(Number, f64, [
    read_zero:
    r#"0"# => 0,

    read_positive_integer:
    r#"314"# => 314,

    read_negative_integer:
    r#"-314"# => -314,

    read_positive_float:
    r#"3.14"# => 3.14,

    read_negative_float:
    r#"-3.14"# => -3.14,

    read_missing_decimal:
    r#"3."# => 3.0,

    stop_on_second_dot:
    r#"3.14.15"# => 3.14,
]);

test_read!(List, Vec<Object>, [
    read_empty_list:
    r#"()"# => vec![],

    read_list:
    r#"(0)"# => vec![Object::Number(0_f64)],

    read_list_with_trailing_whitespace:
    r#"(0  )"# => vec![Object::Number(0_f64)],

    read_multitype_list:
    r#"("str" 0)"# => vec![Object::String(String::from("str")), Object::Number(0_f64)],

    read_nested_list:
    r#"(0 (1 1))"# =>
    vec![Object::Number(0_f64), Object::List(vec![Object::Number(1_f64), Object::Number(1_f64)])],
]);

test_fail!(List, [
    fail_on_unterminated_list:
    r#"(0 (1 1)"# => "Unterminated list",
]);

test_read!(Boolean, bool, [
    read_true:
    r#"true"# => true,

    read_false:
    r#"false"# => false,
]);

test_read!(Nil, (), [
    read_nil:
    r#"nil"# => (),
]);

test_read!(Symbol, String, [
    read_alpha:
    r#"ident"# => "ident",

    read_alphanumeric:
    r#"ident001"# => "ident001",

    read_earmuffs:
    r#"*uwu*"# => "*uwu*",

    stop_at_quote:
    r#"ident""# => "ident",

    stop_at_list_open:
    r#"ident(""# => "ident",

    stop_at_list_close:
    r#"ident)""# => "ident",
]);

test_read!(Nil, (), [
    ignore_comment:
    r#"; comment 01 (1 2 3) """# => (),
]);

test_read!(Number, f64, [
    end_comment_on_lf:
    "; Pie\n3.14" => 3.14,

    end_comment_on_cr:
    "; Pie\r3.14" => 3.14,
]);

test_fail!(Nil, [
    stop_at_comment:
    r#"(+ 1 1 ; my list"# => "Unterminated list",
]);
