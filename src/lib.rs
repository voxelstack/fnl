mod utils;

use futures::{stream::Peekable, Stream, StreamExt};
use std::{fmt, pin::Pin};
use utils::set_panic_hook;
use wasm_bindgen::JsValue;

#[derive(Debug)]
pub enum Object {
    String(String),
    Number(f64),
    Nil(()),
}

impl Into<JsValue> for Object {
    fn into(self) -> JsValue {
        match self {
            Object::String(string) => JsValue::from_str(&string),
            Object::Number(number) => JsValue::from_f64(number),
            Object::Nil(()) => JsValue::null(),
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

pub async fn read<I>(input: &mut Pin<&mut Peekable<I>>) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    set_panic_hook();

    let object: Result<Object, ParseError> = loop {
        // We can only peek once, so call next here and pass ch to the reader if needed.
        match input.as_mut().next().await {
            Some(ch) if ch.is_whitespace() => continue,
            Some(ch) => {
                break match ch {
                    '"' => read_string(input).await,
                    '-' if input.as_mut().peek().await.is_some_and(|x| x.is_numeric()) => {
                        read_number(input, '-').await
                    }
                    _ if ch.is_numeric() => read_number(input, ch).await,
                    _ => todo!(),
                }
            }
            None => break Ok(Object::Nil(())),
        };
    };

    match input.as_mut().next().await {
        Some(_) => Err(ParseError(String::from("Expected EOF"))),
        None => object,
    }
}

async fn read_string<I>(input: &mut Pin<&mut Peekable<I>>) -> Result<Object, ParseError>
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

async fn read_number<I>(input: &mut Pin<&mut Peekable<I>>, curr: char) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    let mut number = String::from(curr);
    while let Some(ch) = input.as_mut().peek().await {
        match ch {
            ch if ch.is_numeric() => {
                number.push(*ch);
                input.as_mut().next().await;
            }
            '.' => {
                number.push(*ch);
                input.as_mut().next().await;

                if let Some(ch) = input.as_mut().next_if(|x| x.is_numeric()).await {
                    number.push(ch);
                    continue;
                }
                return Err(ParseError(String::from("Missing decimal part")));
            }
            _ => break,
        }
    }
    Ok(Object::Number(number.parse::<f64>().map_err(|_| {
        ParseError(String::from("Could not parse number"))
    })?))
}
