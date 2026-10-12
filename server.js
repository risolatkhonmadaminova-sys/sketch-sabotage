const express = require('express');
const http = require('http');
const  {
  Server
}
= require('socket.io');
const crypto = require('crypto');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server,   {
  cors:  {
    origin: true
  }
});
app.use(express.static(path.join(__dirname,  'public')));
app.get('/health',  (_,  res) => res.json( {
  ok: true
}));
const rooms = new Map();
const packs =  {
  mixed: [['rocket', 'spaceship'], ['cat', 'tiger'], ['pizza', 'pie'], ['castle', 'house'], ['octopus', 'jellyfish'], ['bicycle', 'motorcycle'], ['rainbow', 'sunset'], ['robot', 'astronaut'], ['dragon', 'dinosaur'], ['ice cream', 'cupcake'], ['airplane', 'bird'], ['crown', 'hat']],    animals: [['cat', 'tiger'], ['dog', 'wolf'], ['octopus', 'jellyfish'], ['dragon', 'dinosaur'], ['shark', 'dolphin'], ['rabbit', 'hare'], ['owl', 'eagle']],    food: [['pizza', 'pie'], ['burger', 'sandwich'], ['ice cream', 'cupcake'], ['sushi', 'taco'], ['cookie', 'pancake']],    objects: [['rocket', 'spaceship'], ['bicycle', 'motorcycle'], ['crown', 'hat'], ['castle', 'house'], ['guitar', 'violin']]
};
function code() {
  let c;
  do  {
    c=crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  while(rooms.has(c));
  return c;
}
function pub(r) {
  return  {
    code:r.code, hostId:r.hostId, settings:r.settings, phase:r.phase, round:r.round, players:[...r.players.values()].map(p=>( {
      id:p.id, name:p.name, score:p.score, active:p.active, connected:p.connected, host:p.id===r.hostId, submitted:r.submissions.has(p.id)
    })), drawings:r.phase==='gallery'||r.phase==='vote'||r.phase==='result'?[...r.submissions.entries()].map(([id, data])=>( {
      id, name:r.players.get(id)?.name||'Player', data
    })):[], votes:r.phase==='result'?Object.fromEntries(r.votes): {
    }, result:r.phase==='result'?r.result:null, timeLeft:r.deadline?Math.max(0, Math.ceil((r.deadline-Date.now())/1000)):0
  };
}
function sync(r) {
  io.to(r.code).emit('state', pub(r));
}
function tell(socket, msg) {
  socket.emit('notice', msg)
}
function endRound(r, target) {
  const p=r.players.get(target);
  if(!p)return;
  const found=target===r.spyId;
  p.active=false;
  r.eliminated++;
  if(found) {
    r.phase='result';
    r.result= {
      found:true, target, spyId:r.spyId, word:r.word, spyWord:r.spyWord
    };
  }
  else {
    r.phase='result';
    r.result= {
      found:false, target, spyId:r.spyId, word:r.word, spyWord:r.spyWord
    };
  }
  r.deadline=null;
  io.to(r.code).emit('roundResult', r.result);
  sync(r);
}
function startRound(r) {
  const active=[...r.players.values()].filter(p=>p.active&&p.connected);
  if(active.length<3) {
    r.phase='lobby';
    sync(r);
    return;
  }
  const pair=(packs[r.settings.pack]||packs.mixed)[Math.floor(Math.random()*(packs[r.settings.pack]||packs.mixed).length)];
  const flip=Math.random()<.5;
  r.word=pair[flip?1:0];
  r.spyWord=pair[flip?0:1];
  r.spyId=active[Math.floor(Math.random()*active.length)].id;
  r.round++;
  r.phase='draw';
  r.submissions=new Map();
  r.votes=new Map();
  r.result=null;
  r.deadline=Date.now()+r.settings.duration*1000;
  for(const p of active) {
    io.to(p.id).emit('privateRole',  {
      isSpy:p.id===r.spyId, word:p.id===r.spyId?r.spyWord:r.word, round:r.round
    });
  }
  sync(r);
  clearTimeout(r.timer);
  r.timer=setTimeout(()=>finishDraw(r), r.settings.duration*1000);
}
function finishDraw(r) {
  if(!r||r.phase!=='draw')return;
  r.phase='gallery';
  r.deadline=null;
  sync(r);
}
function leaveRoom(socket) {
  const old=socket.data.room;
  if(!old)return;
  const r=rooms.get(old);
  socket.leave(old);
  socket.data.room=null;
  if(!r)return;
  const p=r.players.get(socket.id);
  if(p) {
    p.connected=false;
  }
  const connected=[...r.players.values()].filter(x=>x.connected);
  if(!connected.length) {
    clearTimeout(r.timer);
    rooms.delete(old);
    return;
  }
  if(r.hostId===socket.id) {
    r.hostId=connected[0].id;
  }
  sync(r);
}
io.on('connection', socket=> {
  socket.on('createRoom', ( {
    name, playerLimit=15, duration=60, pack='mixed'
  }
  = {
  })=> {
    const n=String(name||'Player').trim().slice(0, 18)||'Player';
    const roomCode=code();
    const r= {
      code:roomCode, hostId:socket.id, settings: {
        playerLimit:Math.max(10, Math.min(15, Number(playerLimit)||15)), duration:Math.max(20, Math.min(120, Number(duration)||60)), pack:packs[pack]?pack:'mixed'
      }, players:new Map(), phase:'lobby', round:0, submissions:new Map(), votes:new Map(), deadline:null, spyId:null, timer:null
    };
    r.players.set(socket.id,  {
      id:socket.id, name:n, score:0, active:true, connected:true
    });
    rooms.set(roomCode, r);
    socket.join(roomCode);
    socket.data.room=roomCode;
    socket.emit('joined',  {
      code:roomCode, host:true, invite:`${publicBase(socket)}#room=${roomCode}`
    });
    sync(r);
  });
  socket.on('joinRoom', ( {
    code:raw, name
  }
  = {
  })=> {
    const c=String(raw||'').trim().toUpperCase();
    const r=rooms.get(c);
    if(!r)return tell(socket, 'Room not found. Check the invite link.');
    if(r.phase!=='lobby')return tell(socket, 'This game has already started.');
    if(r.players.size>=r.settings.playerLimit)return tell(socket, 'This room is full.');
    const n=String(name||'Player').trim().slice(0, 18)||'Player';
    r.players.set(socket.id,  {
      id:socket.id, name:n, score:0, active:true, connected:true
    });
    socket.join(c);
    socket.data.room=c;
    socket.emit('joined',  {
      code:c, host:false, invite:`${publicBase(socket)}#room=${c}`
    });
    sync(r);
  });
  socket.on('startGame', ()=> {
    const r=rooms.get(socket.data.room);
    if(!r)return;
    if(r.hostId!==socket.id)return tell(socket, 'Only the host can start.');
    if(r.players.size<10)return tell(socket, 'At least 10 real players must join before the game starts.');
    startRound(r);
  });
  socket.on('drawingSubmitted', data=> {
    const r=rooms.get(socket.data.room);
    if(!r||r.phase!=='draw')return;
    if(!r.players.get(socket.id)?.active)return;
    if(typeof data!=='string'||data.length>2_000_000)return tell(socket, 'Drawing was too large.');
    r.submissions.set(socket.id, data);
    sync(r);
    const active=[...r.players.values()].filter(p=>p.active&&p.connected);
    if(active.every(p=>r.submissions.has(p.id)))finishDraw(r);
  });
  socket.on('startVoting', ()=> {
    const r=rooms.get(socket.data.room);
    if(!r||r.phase!=='gallery')return;
    if(r.hostId!==socket.id)return tell(socket, 'Only the host can start voting.');
    r.phase='vote';
    r.votes=new Map();
    sync(r);
  });
  socket.on('castVote', target=> {
    const r=rooms.get(socket.data.room);
    if(!r||r.phase!=='vote')return;
    if(!r.players.get(socket.id)?.active)return;
    if(!r.players.get(target)?.active)return;
    r.votes.set(socket.id, target);
    io.to(r.code).emit('voteProgress',  {
      count:r.votes.size, total:[...r.players.values()].filter(p=>p.active&&p.connected).length
    });
    const active=[...r.players.values()].filter(p=>p.active&&p.connected);
    if(active.every(p=>r.votes.has(p.id)))resolveVotes(r);
  });
  socket.on('resolveVotes', ()=> {
    const r=rooms.get(socket.data.room);
    if(!r||r.phase!=='vote'||r.hostId!==socket.id)return;
    resolveVotes(r);
  });
  socket.on('nextRound', ()=> {
    const r=rooms.get(socket.data.room);
    if(!r||r.phase!=='result'||r.hostId!==socket.id)return;
    if(r.result?.found) {
      r.phase='lobby';
      r.players.forEach(p=> {
        p.active=true;
        p.score=0
      });
      r.round=0;
      sync(r);
    }
    else startRound(r);
  });
  socket.on('chat', msg=> {
    const r=rooms.get(socket.data.room);
    if(!r||!r.players.has(socket.id))return;
    const p=r.players.get(socket.id);
    const t=String(msg||'').trim().slice(0, 240);
    if(t)io.to(r.code).emit('chat',  {
      name:p.name, text:t
    });
  });
  socket.on('disconnect', ()=>leaveRoom(socket));
});
function resolveVotes(r) {
  if(r.phase!=='vote')return;
  const tally=new Map();
  for(const target of r.votes.values())tally.set(target, (tally.get(target)||0)+1);
  if(!tally.size)return;
  const max=Math.max(...tally.values());
  const tied=[...tally].filter(([, v])=>v===max).map(([id])=>id);
  const target=tied[Math.floor(Math.random()*tied.length)];
  for(const [voter, voted] of r.votes) {
    if(voted===target) {
      const p=r.players.get(voter);
      if(p)p.score+=2;
    }
  }
  endRound(r, target);
}
function publicBase(socket) {
  const proto=socket.request.headers['x-forwarded-proto']||'http';
  const host=socket.request.headers['x-forwarded-host']||socket.request.headers.host||'localhost:3000';
  return `${proto}://${host}`;
}
const port=process.env.PORT||3000;
server.listen(port, '0.0.0.0', ()=>console.log(`Sketch & Sabotage listening on ${port}`));
