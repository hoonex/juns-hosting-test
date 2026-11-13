use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Clone, Deserialize, Serialize)]
struct Room {
    floor: u8,
    id: String,
    name: String,
    aliases: String,
    zone: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    door: [f64;2],
}

#[derive(Deserialize)]
struct Data {
    floors: std::collections::BTreeMap<String,Vec<Room>>,
}

fn data()->Data{
    serde_json::from_str(include_str!("../data.json")).expect("valid atlas catalogue")
}
fn norm(s:&str)->String {
    s.to_lowercase().chars().filter(|c| !c.is_whitespace() && !matches!(c,'·'|'.'|',')).collect()
}
fn search(q:&str)->Vec<Room>{
    let needle=norm(q);
    if needle.is_empty(){return Vec::new()}
    let mut rooms:Vec<Room>=data().floors.into_values().flatten()
        .filter(|r| norm(&format!("{} {} {}",r.name,r.id,r.aliases)).contains(&needle))
        .collect();
    rooms.sort_by_key(|r|(r.floor,r.id.clone()));
    rooms
}
fn room(floor:u8,id:&str)->Option<Room>{
    data().floors.get(&floor.to_string())?.iter().find(|r|r.id==id).cloned()
}
#[derive(Serialize)]
struct Route<'a>{
    floor:u8,
    room:String,
    from:String,
    points:Vec<[f64;2]>,
    note:&'a str,
}
fn route(r:&Room,start:&str)->Route<'static>{
    let left=[211.0,166.0];
    let center_west=[823.0,166.0];
    let center_east=[823.0,300.0];
    let right=[1714.0,300.0];
    let mut path=match start{
       "west"=>vec![left],
       "east"=>vec![right],
       _=>vec![center_east],
    };
    if r.zone=="east" {
        if start=="west" { path.extend([center_west,center_east]); }
        path.push([r.door[0],300.0]);
    } else {
        if start=="east" {path.extend([center_east,center_west]);}
        else if start=="center" {path.push(center_west);}
        path.push([r.door[0],166.0]);
    }
    path.push(r.door);
    Route{floor:r.floor,room:r.id.clone(),from:start.to_string(),points:path,
          note:"원본 도면의 문 좌표를 기준으로 한 참고 경로. 비상 대피용 아님"}
}
fn cors(mut r:Response)->Result<Response>{
    r.headers_mut().set("Access-Control-Allow-Origin","https://jungdong-campus-map.agfvrd.workers.dev")?;
    r.headers_mut().set("Access-Control-Allow-Methods","GET, OPTIONS")?;
    r.headers_mut().set("Access-Control-Allow-Headers","Content-Type")?;
    r.headers_mut().set("Cache-Control","no-store")?;
    Ok(r)
}
#[event(fetch)]
async fn main(req:Request,_env:Env,_ctx:Context)->Result<Response>{
    if req.method()==Method::Options {return cors(Response::empty()?);}
    let url=req.url()?;
    let q=|key:&str|url.query_pairs().find(|(k,_)|k==key)
        .map(|(_,v)|v.to_string()).unwrap_or_default();
    let result=match url.path(){
       "/" | "/api/health"=>Response::from_json(&serde_json::json!({
            "ok":true,"runtime":"rust/wasm","version":"2026-11-13","rooms":67
       })),
       "/api/search"=>Response::from_json(&search(&q("q"))),
       "/api/room"=>{
           let f=q("floor").parse::<u8>().unwrap_or(3);
           match room(f,&q("id")){Some(r)=>Response::from_json(&r),None=>Response::error("Room not found",404)}
       },
       "/api/route"=>{
           let f=q("floor").parse::<u8>().unwrap_or(3);
           let s=q("start");
           match room(f,&q("id")){Some(r)=>Response::from_json(&route(&r,&s)),None=>Response::error("Room not found",404)}
       },
       _=>Response::error("Not found",404),
    }?;
    cors(result)
}
#[cfg(test)]
mod tests {
   use super::*;
   #[test] fn count(){assert_eq!(data().floors.values().map(Vec::len).sum::<usize>(),67);}
   #[test] fn lookup(){assert_eq!(search("2-6")[0].name,"2학년 6반");}
   #[test] fn east_direct(){
       let r=room(3,"2-6").unwrap();
       let p=route(&r,"east");
       assert_eq!(p.points.len(),3);
       assert_eq!(*p.points.last().unwrap(),r.door);
   }
}
