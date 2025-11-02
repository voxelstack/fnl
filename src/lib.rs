mod utils;

use futures::{stream::Peekable, Stream, StreamExt};
use std::{fmt, pin::Pin};
use utils::set_panic_hook;
use wasm_bindgen::JsValue;

#[derive(Debug)]
pub enum Object {
    Nil(()),
    String(String),
}

impl Into<JsValue> for Object {
    fn into(self) -> JsValue {
        match self {
            Object::Nil(()) => JsValue::null(),
            Object::String(string) => JsValue::from_str(&string),
        }
    }
}

#[derive(Debug)]
pub struct ParseError(String);

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Parse error: {}.", self.0)
    }
}

pub async fn read<I>(mut input: Pin<&mut Peekable<I>>) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    set_panic_hook();

    while let Some(ch) = input.as_mut().next().await {
        if ch.is_whitespace() {
            continue;
        }

        return match ch {
            '"' => read_string(input),
            _ => todo!(),
        }
        .await;
    }

    Ok(Object::Nil(()))
}

async fn read_string<I>(mut input: Pin<&mut Peekable<I>>) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    let mut string = String::new();
    while let Some(ch) = input.as_mut().next().await {
        match ch {
            '"' => return Ok(Object::String(string)),
            '\\' => {
                let escaped = match input.as_mut().next().await {
                    Some('n') => Ok('\n'),
                    Some('\\') => Ok('\\'),
                    Some('"') => Ok('"'),
                    None => Err(ParseError(String::from("Unterminated string"))),
                    _ => Err(ParseError(String::from("Invalid escape character"))),
                }?;
                string.push(escaped);
            }
            _ => string.push(ch),
        }
    }
    Err(ParseError(String::from("Unterminated string")))
}
