 let isLit = false;
    let isUnlocked = false;

    // ---- Generate dust particles ----
    (function(){
        const dust = document.getElementById('dust');
        for(let i=0;i<28;i++){
            const p = document.createElement('div');
            p.className='dust-particle';
            const x=Math.random()*400-200;
            const y=Math.random()*300;
            const dx=(Math.random()-0.5)*120;
            const dy=Math.random()*160+60;
            const dur=4+Math.random()*8;
            const delay=Math.random()*6;
            p.style.cssText=`
                left:${50+Math.random()*60-30}%;
                top:${Math.random()*60}%;
                --dx:${dx}px;
                --dy:${dy}px;
                animation-duration:${dur}s;
                animation-delay:${delay}s;
                width:${1+Math.random()*2}px;
                height:${1+Math.random()*2}px;
                opacity:0.4;
            `;
            dust.appendChild(p);
        }
    })();

    // ---- Light toggle ----
    window.toggleLight = function(){
        if(isUnlocked) return; // don't re-trigger if already unlocked
        isLit = !isLit;
        const room = document.getElementById('room');
        const toggle = document.getElementById('toggle');
        const pwdPanel = document.getElementById('pwd-panel');

        room.classList.toggle('lit', isLit);
        toggle.classList.toggle('on', isLit);

        if(isLit){
            // Show password panel after lamp flicker
            setTimeout(()=>{
                pwdPanel.classList.add('show');
                setTimeout(()=>document.getElementById('pwd-inp').focus(),300);
            }, 600);
        } else {
            pwdPanel.classList.remove('show');
            document.getElementById('pwd-err').textContent='';
            document.getElementById('pwd-inp').value='';
        }
    };

    // ---- Password ----
    window.checkPwd = function(){
        const val = document.getElementById('pwd-inp').value;
        const panel = document.getElementById('pwd-panel');
        const err = document.getElementById('pwd-err');

        if(val === 'express200@'){
            isUnlocked = true;
            panel.classList.remove('show');
            setTimeout(()=>{
                document.getElementById('main-panel').classList.add('show');
            }, 300);
        } else {
            err.textContent = '❌ Code incorrect';
            panel.classList.add('pwd-shake');
            setTimeout(()=>panel.classList.remove('pwd-shake'),500);
            document.getElementById('pwd-inp').value='';
            // Flicker effect
            flickerLight();
        }
    };

    function flickerLight(){
        const room=document.getElementById('room');
        let count=0;
        const flicker=setInterval(()=>{
            room.classList.toggle('lit');
            count++;
            if(count>=4){
                clearInterval(flicker);
                room.classList.add('lit');
            }
        },80);
    }

    window.togglePwdEye = function(){
        const inp=document.getElementById('pwd-inp');
        const eye=document.getElementById('pwd-eye');
        inp.type=inp.type==='password'?'text':'password';
        eye.textContent=inp.type==='password'?'👁':'🙈';
    };

    // ---- Lock room ----
    window.lockRoom = function(){
        isUnlocked=false;
        isLit=false;
        const room=document.getElementById('room');
        const toggle=document.getElementById('toggle');
        // Fade out main panel
        const main=document.getElementById('main-panel');
        main.classList.remove('show');
        setTimeout(()=>{
            room.classList.remove('lit');
            toggle.classList.remove('on');
        },400);
        document.getElementById('pwd-inp').value='';
        document.getElementById('pwd-err').textContent='';
    };

    // ---- Subtle parallax on mouse move ----
    document.addEventListener('mousemove',(e)=>{
        const x=(e.clientX/window.innerWidth-0.5)*10;
        const y=(e.clientY/window.innerHeight-0.5)*6;
        document.querySelector('.lamp-wire').style.transform=`translateX(calc(-50% + ${x*0.3}px))`;
        document.querySelector('.lamp-shade').style.transform=`translateX(calc(-50% + ${x*0.3}px))`;
        document.querySelector('.bulb').style.transform=`translateX(calc(-50% + ${x*0.3}px))`;
    });
