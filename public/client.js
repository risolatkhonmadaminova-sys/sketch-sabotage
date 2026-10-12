const socket=io();
let room='', isHost=false, myId='', phase='', myRole=null, state=null, selectedColor='#6d55e8', lineWidth=7, drawing=false, last=null, chosenVote=null, hasSubmitted=false, timerInterval=null;
const $=id=>document.getElementById(id);
const views=['home', 'lobby', 'game'];
function view(v) {
  views.forEach(x=>$(x).classList.toggle('hidden', x!==v));
}
function note(t) {
  $('notice').textContent=t;
  $('notice').classList.remove('hidden');
  setTimeout(()=>$('notice').classList.add('hidden'), 4000)
}
function name() {
  return $('name').value.trim()||'Player'
}
socket.on('connect', ()=> {
  $('connection').textContent='● Connected';
  $('connection').style.color='var(--mint)';
  myId=socket.id;
  const hash=location.hash.match(/room=([A-Z0-9]+)/i);
  if(hash) {
    $('joinCode').value=hash[1].toUpperCase();
  }
});
socket.on('disconnect', ()=> {
  $('connection').textContent='● Reconnecting…';
  $('connection').style.color='var(--pink)'
});
socket.on('notice', note);
socket.on('joined', d=> {
  room=d.code;
  isHost=d.host;
  history.replaceState(null, '', `#room=${room}`);
  $('roomCode').textContent=room;
  $('invite').value=d.invite;
  view('lobby');
  note(isHost?'Room created! Share your invite link.':'You joined the room.');
});
socket.on('state', s=> {
  state=s;
  room=s.code;
  isHost=s.hostId===socket.id;
  myId=socket.id;
  renderState(s)
});
socket.on('privateRole', r=> {
  myRole=r;
  $('roleTitle').textContent=r.isSpy?'🕵️ You are the Spy!':`Your word: ${r.word}`;
  $('roleText').textContent=r.isSpy?`Your secret word is “${r.word}”. Draw it convincingly without revealing you are the Spy.`:'Keep your word secret. Draw it without writing letters or numbers.';
  $('role').classList.toggle('spy', r.isSpy);
});
socket.on('roundResult', r=> {
  $('resultTitle').textContent=r.found?'🎉 The Spy was found!':'😬 Innocent player eliminated';
  $('resultText').textContent=`${state?.players.find(p=>p.id===r.target)?.name||'A player'} ${r.found?'was the Spy. The crew wins!':'was innocent. The Spy is still hidden; another round begins.'} Secret word: ${r.word}. Spy word: ${r.spyWord}.`;
});
socket.on('voteProgress', d=>$('voteProgress').textContent=`${d.count}/${d.total} votes received`);
socket.on('chat', m=> {
  const d=document.createElement('div');
  d.className='chatline';
  const b=document.createElement('b');
  b.textContent=m.name+': ';
  d.append(b, document.createTextNode(m.text));
  $('chatlog').append(d);
  $('chatlog').scrollTop=$('chatlog').scrollHeight;
});
$('create').onclick=()=>socket.emit('createRoom',  {
  name:name(), playerLimit:+$('limit').value, duration:+$('duration').value, pack:$('pack').value
});
$('join').onclick=()=>socket.emit('joinRoom',  {
  code:$('joinCode').value, name:name()
});
$('joinCode').addEventListener('keydown', e=> {
  if(e.key==='Enter')$('join').click()
});
$('copy').onclick=async()=> {
  try {
    await navigator.clipboard.writeText($('invite').value);
    note('Invite link copied!')
  }
  catch {
    $('invite').select();
    document.execCommand('copy');
    note('Invite link selected — copy it.')
  }
};
$('start').onclick=()=>socket.emit('startGame');
function renderState(s) {
  $('playerCount').textContent=`${s.players.length}/${s.settings.playerLimit} joined`;
  $('players').innerHTML='';
  s.players.forEach(p=> {
    const d=document.createElement('div');
    d.className='player';
    d.innerHTML=`<span class="avatar">${p.host?'👑':'🎨'}</span><b></b><div class="tag"></div>`;
    d.querySelector('b').textContent=p.name;
    d.querySelector('.tag').textContent=(p.host?'HOST · ':'')+(p.connected?'ONLINE':'RECONNECTING');
    $('players').append(d)
  });
  $('start').disabled=!isHost||s.players.length<10;
  $('start').textContent=isHost?'Start game →':'Waiting for host…';
  $('lobbyHint').textContent=`${s.players.length} real player(s) connected. At least 10 real players are required to start; room limit: ${s.settings.playerLimit}.`;
  if(s.phase==='lobby') {
    view('lobby');
    return;
  }
  view('game');
  phase=s.phase;
  $('roundTag').textContent=`ROUND ${s.round} · ${s.players.filter(p=>p.active).length} PLAYERS LEFT`;
  ['drawArea', 'galleryArea', 'voteArea', 'resultArea'].forEach(x=>$(x).classList.add('hidden'));
  if(s.phase==='draw') {
    $('drawArea').classList.remove('hidden');
    $('phaseTitle').textContent='Draw your word';
    $('submitDrawing').disabled=s.players.find(p=>p.id===socket.id)?.submitted||false;
    hasSubmitted=$('submitDrawing').disabled;
    if(!timerInterval)timerInterval=setInterval(()=> {
      if(state?.phase==='draw') {
        $('timer').textContent='00:'+String(Math.max(0, state.timeLeft--)).padStart(2, '0');
        if(state.timeLeft<=0) {
          clearInterval(timerInterval);
          timerInterval=null
        }
      }
      else {
        clearInterval(timerInterval);
        timerInterval=null
      }
    }, 1000);
  }
  else if(s.phase==='gallery') {
    $('galleryArea').classList.remove('hidden');
    $('phaseTitle').textContent='The gallery';
    $('beginVote').disabled=!isHost;
    renderGallery(s)
  }
  else if(s.phase==='vote') {
    $('voteArea').classList.remove('hidden');
    $('phaseTitle').textContent='Vote for the Spy';
    $('resolve').classList.toggle('hidden', !isHost);
    renderVotes(s)
  }
  else if(s.phase==='result') {
    $('resultArea').classList.remove('hidden');
    $('phaseTitle').textContent='Round result';
    $('next').classList.toggle('hidden', !isHost);
    $('next').textContent=s.result?.found?'Back to lobby / reset →':'Next round →';
    renderScores(s);
  }
}
function renderGallery(s) {
  $('gallery').innerHTML='';
  s.drawings.forEach(a=> {
    const d=document.createElement('div');
    d.className='art';
    const h=document.createElement('div');
    h.className='arthead';
    h.textContent=a.name;
    const img=document.createElement('img');
    img.src=a.data;
    img.alt='Player drawing';
    const f=document.createElement('div');
    f.className='artfoot muted';
    f.textContent='✏️ Submitted drawing';
    d.append(h, img, f);
    $('gallery').append(d)
  });
  $('beginVote').disabled=!isHost;
}
function renderVotes(s) {
  $('voteGrid').innerHTML='';
  s.players.filter(p=>p.active&&p.connected).forEach(p=> {
    const d=document.createElement('div');
    d.className='votecard';
    const b=document.createElement('b');
    b.textContent=p.name;
    const btn=document.createElement('button');
    btn.textContent=p.id===socket.id?'Vote for yourself':'Vote this player';
    btn.className=p.id===chosenVote?'':'secondary';
    btn.onclick=()=> {
      chosenVote=p.id;
      socket.emit('castVote', p.id);
      renderVotes(state)
    };
    d.append(b, document.createElement('br'), btn);
    $('voteGrid').append(d)
  });
}
function renderScores(s) {
  $('scores').innerHTML='';
  [...s.players].sort((a, b)=>b.score-a.score).forEach((p, i)=> {
    const d=document.createElement('div');
    d.className='player';
    d.textContent=`${i+1}. ${p.name} — ${p.score} pts${p.active?'':' · eliminated'}`;
    $('scores').append(d)
  });
}
$('beginVote').onclick=()=>socket.emit('startVoting');
$('resolve').onclick=()=>socket.emit('resolveVotes');
$('next').onclick=()=>socket.emit('nextRound');
$('chatForm').onsubmit=e=> {
  e.preventDefault();
  if($('chatInput').value.trim())socket.emit('chat', $('chatInput').value);
  $('chatInput').value=''
};
const canvas=$('canvas'), ctx=canvas.getContext('2d');
function clearCanvas() {
  ctx.fillStyle='#fffefb';
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
clearCanvas();
function point(e) {
  const r=canvas.getBoundingClientRect();
  return {
    x:(e.clientX-r.left)*canvas.width/r.width, y:(e.clientY-r.top)*canvas.height/r.height
  }
}
canvas.onpointerdown=e=> {
  if(phase!=='draw'||hasSubmitted)return;
  drawing=true;
  last=point(e);
  canvas.setPointerCapture(e.pointerId)
};
canvas.onpointermove=e=> {
  if(!drawing||!last)return;
  const p=point(e);
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p.x, p.y);
  ctx.strokeStyle=selectedColor;
  ctx.lineWidth=lineWidth;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.stroke();
  last=p
};
function stop() {
  drawing=false;
  last=null
}
canvas.onpointerup=stop;
canvas.onpointercancel=stop;
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=> {
  selectedColor=b.dataset.color;
  lineWidth=+$('size').value
});
$('size').oninput=e=>lineWidth=+e.target.value;
$('eraser').onclick=()=> {
  selectedColor='#fffefb';
  lineWidth=+$('size').value*2.5
};
$('clear').onclick=clearCanvas;
$('submitDrawing').onclick=()=> {
  if(hasSubmitted)return;
  hasSubmitted=true;
  $('submitDrawing').disabled=true;
  socket.emit('drawingSubmitted', canvas.toDataURL('image/jpeg', .7));
  note('Drawing submitted — waiting for the gallery.')
};
