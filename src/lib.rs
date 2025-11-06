mod utils;

use futures::{stream::Peekable, Stream, StreamExt};
use std::{fmt, pin::Pin};
use utils::set_panic_hook;
use wasm_bindgen::JsValue;
use web_sys::js_sys::Array;

#[derive(Debug, PartialEq)]
pub enum Object {
    List(Vec<Object>),
    String(String),
    Number(f64),
    Symbol(String), // TODO Actual symbols
    Boolean(bool),
    Nil(()),
}

impl Into<JsValue> for Object {
    fn into(self) -> JsValue {
        match self {
            Object::List(list) => JsValue::from(
                list.into_iter()
                    .map(Into::<JsValue>::into)
                    .collect::<Array>(),
            ),
            Object::String(string) => JsValue::from_str(&string),
            Object::Number(number) => JsValue::from_f64(number),
            Object::Symbol(symbol) => JsValue::from_str(&symbol),
            Object::Boolean(boolean) => JsValue::from_bool(boolean),
            Object::Nil(()) => JsValue::null(),
        }
    }
}

#[derive(Debug)]
pub struct ParseError(pub String);

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

    loop {
        // We can only peek once, so call next here and pass ch to the reader if needed.
        match input.as_mut().next().await {
            Some(';') => read_comment(input).await,
            Some(ch) if ch.is_whitespace() => continue,
            Some(ch) => {
                break match ch {
                    '(' => Box::pin(read_list(input)).await,
                    '"' => read_string(input).await,
                    '-' if input.as_mut().peek().await.is_some_and(|x| x.is_numeric()) => {
                        read_number(input, '-').await
                    }
                    ch if ch.is_numeric() => read_number(input, ch).await,
                    _ => read_token(input, ch).await,
                }
            }
            None => break Ok(Object::Nil(())),
        };
    }
}

async fn read_comment<I>(input: &mut Pin<&mut Peekable<I>>)
where
    I: Stream<Item = char>,
{
    while let Some(ch) = input.as_mut().next().await {
        match ch {
            // \n is whitespace, we can ignore it on \r\n.
            '\n' | '\r' => return,
            _ => continue,
        }
    }
}

async fn read_list<I>(input: &mut Pin<&mut Peekable<I>>) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    let mut list = Vec::new();
    while let Some(ch) = input.as_mut().peek().await {
        match ch {
            ')' => {
                input.as_mut().next().await;
                return Ok(Object::List(list));
            }
            ch if ch.is_whitespace() => {
                input.as_mut().next().await;
                continue;
            }
            _ => list.push(read(input).await?),
        }
    }
    Err(ParseError(String::from("Unterminated list")))
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

                while let Some(ch) = input.as_mut().next_if(|x| x.is_numeric()).await {
                    number.push(ch);
                }
                break;
            }
            _ => break,
        }
    }
    Ok(Object::Number(number.parse::<f64>().map_err(|_| {
        ParseError(String::from("Could not parse number"))
    })?))
}

async fn read_token<I>(input: &mut Pin<&mut Peekable<I>>, curr: char) -> Result<Object, ParseError>
where
    I: Stream<Item = char>,
{
    let mut token = String::from(curr);
    while let Some(ch) = input.as_mut().peek().await {
        match ch {
            '"' | '(' | ')' => break,
            ch if ch.is_whitespace() => break,
            _ => {
                token.push(*ch);
                input.as_mut().next().await;
            }
        }
    }
    Ok(interpret_token(token))
}

fn interpret_token(token: String) -> Object {
    match token.as_str() {
        "true" => Object::Boolean(true),
        "false" => Object::Boolean(false),
        "nil" => Object::Nil(()),
        _ => Object::Symbol(token),
    }
}
