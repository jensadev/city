/* Skapa ett canvas och sätt storleken till fönstrets storlek */
let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
canvas.setAttribute("id", "game");
canvas.width  = 1120;
canvas.height = 800;
let images = {};
let bgPos = 0;
let fgPos = 0;
let mouseX, mouseY;
let particles = [];

const PI_2 = 2*Math.PI;

const safeLevel = 650;
const warningLevel = 400;
const dangerLevel = 200;

let warningDamage = 10;
let dangerDamage = 5;
let beamDamage = 8;
let healthRegen = 20;

const sources = {
    bg: 'city/bg.png',
    fg: 'city/fg.png',
    sky: 'city/sky.png',
    player: 'city/player.png',
    playerDanger: 'city/player_danger.png',
    playerWarning: 'city/player_warning.png'
};

function loadImages(sources, callback) {
    let loadedImages = 0;
    let numImages = 0;
    // get num of sources
    for(let src in sources) {
        numImages++;
    }
    for(let src in sources) {
        images[src] = new Image();
        images[src].onload = function() {
            if(++loadedImages >= numImages) {
                callback(images);
            }
        };
        images[src].src = sources[src];
    }
}

loadImages(sources, function() {
    window.requestAnimationFrame(step); 
});

const Player = function(x, y, id) {
    const player = {};
    player.id = id;
    player.x = x;
    player.y = y;
    player.speed = 8;
    player.healthTick = 0;
    player.draw = function() {
        if (beam.active)
            ctx.drawImage(images.playerDanger, this.x, this.y);
        else if(this.y < dangerLevel)
            ctx.drawImage(images.playerDanger, this.x, this.y);
        else if(this.y < warningLevel)
            ctx.drawImage(images.playerWarning, this.x, this.y);
        else
            ctx.drawImage(images.player, this.x, this.y);
    }
    player.update = function() {
        if(move.right && this.x < 1088 ) this.x = this.x + this.speed;
        if(move.left && this.x > 0) this.x = this.x - this.speed;
        if(move.up && this.y > 0) this.y = this.y - this.speed;
        if(move.down && this.y < 768) this.y = this.y + this.speed;
        
        if (beam.active) {
            this.healthTick++;
            
            if(this.healthTick >= beamDamage) {
                healthBar.update(-1);
                this.healthTick = 0;
            }           
        } else if(this.y < dangerLevel) {
            this.healthTick++;

            if(this.healthTick >= dangerDamage) {
                healthBar.update(-1);
                this.healthTick = 0;
            }
        } else if (this.y < warningLevel) {
            this.healthTick++;

            if(this.healthTick >= warningDamage) {
                healthBar.update(-1);
                this.healthTick = 0;
            }
        } else if( this.y > safeLevel) {
            this.healthTick++;

            if(this.healthTick >= healthRegen) {
                if(healthBar.health < 100)
                    healthBar.update(+1);
                this.healthTick = 0;
            }
        }
    }

    return player;    
}

let player = Player(1120 / 2, 600, 1);

function randomColor() {
    var value = 500;
    var r = 50+(Math.floor(Math.random()*205));
    var g = 0;
    var b = 50+(Math.floor(Math.random()*205));
    return "rgba(" + r + "," + g + "," + b + ", 0.5)"
}

const Particle = function(x, y)
{
    let particle = {};
    particle.x = x + 16;
    particle.y = y +16;
    particle.dy = 1 + (Math.random()*3);
    particle.dx = -1 + (Math.random()*2);
    particle.color = (player.y < dangerLevel || beam.active) ? "rgba(255,55,55,0.5)" :
                    (player.y < warningLevel) ? "rgba(200,100,100,0.4)" :
                    "rgba(155,155,155,0.3)";
    particle.size = 2 + Math.floor(Math.random()*2);
    particle.draw = function()
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, PI_2, false);
        // if (beam.active)
        //     ctx.fillStyle = this.danger;
        // else if(player.y < dangerLevel)
        //     ctx.fillStyle = this.danger;
        // else if(player.y < warningLevel)
        //     ctx.fillStyle = this.warning;
        // else
        //     ctx.fillStyle = this.color;

        ctx.fillStyle = this.color;
        
        ctx.fill();
        particle.update();
    }
    particle.update = function()
    {
      this.y += this.dy;
      this.x += this.dx;
    }

    return particle;
}

const HealthBar = function()
{
    const healthBar = {};
    healthBar.health = 100;
    healthBar.maxHealth = 150;
    healthBar.x = 10;
    healthBar.y = 10;
    healthBar.width = 100;
    healthBar.height = 12;
    healthBar.lastChange = "";

    healthBar.draw = function ()
    {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.health, this.height);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1;
        ctx.stroke();

        // ctx.font = "10px Courier";
        // ctx.fillStyle = '#fff';
        // ctx.fillText(this.health, 50, 19);

    }
    healthBar.update = function(val)
    {
        this.health = this.health + val;
    }
    return healthBar;
}

let healthBar = HealthBar();

const Beam = function()
{
    const beam = {};
    beam.width = 1;
    beam.active = false;
    beam.angle = 0;
    beam.length = 200;
    beam.staticLength = 10;
    beam.static = 0;
    beam.calculateAngle = function(pX, pY, mX, mY)
    {
        let dy = mY - pY;
        let dx = mX - pX;
        let theta = Math.atan2(dy, dx); // range (-PI, PI]
        //theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        //if (theta < 0) theta = Math.PI + theta; // range [0, 360)
        this.angle = theta;
    }
    beam.draw = function ()
    {
        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 16);
        ctx.lineTo(player.x + 16 + (this.length - 8) * Math.cos(this.angle),
                player.y + 16 + (this.length - 8) * Math.sin(this.angle));
        ctx.lineWidth = 7;
        ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 16);
        ctx.lineTo(player.x + 16 + (this.length - 4) * Math.cos(this.angle),
                player.y + 16 + (this.length - 4) * Math.sin(this.angle));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 16);
        ctx.lineTo(player.x + 16 + this.length * Math.cos(this.angle),
                player.y + 16 + this.length * Math.sin(this.angle));
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 16);
        ctx.lineTo(player.x + 16 + this.static * Math.cos(this.angle),
                player.y + 16 + this.static * Math.sin(this.angle));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.stroke();

        this.static = this.static + 20;

        console.log(this.static);
        if (this.static > this.length)
            this.static = 0;
    }
    return beam;
}

let beam = Beam();

// move objekt för att hålla reda på hur spelaren flyttar på sig
let move = { right: false, left: false, up: false, down: false }

// Keydown på movement
document.addEventListener("keydown", function(e) {
	switch(e.key) {
		case "d":
            move.right = true;
            break;
		case "a":
            move.left = true;
            break;
        case "w":
            move.up = true;
            break;
		case "s":
            move.down = true;
            break;
        case " ":
            beam.active = true;
        }
});

// keyup på movement
document.addEventListener("keyup", function(e) {
	switch(e.key) {
		case "d":
            move.right = false;
            break;
		case "a":
            move.left = false;
            break;
        case "w":
            move.up = false;
            break;
		case "s":
            move.down = false;
            break;
        case " ":
                beam.active = false;
        }
});

document.addEventListener('mousemove', function(e) {
    let rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
    mouseY = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
}, false);

function step() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.drawImage(images.sky, 0 , 0, 1120, 800);	
    ctx.drawImage(images.bg, bgPos, 0);	
    ctx.drawImage(images.bg, bgPos - 1120, 0);	
    ctx.drawImage(images.fg, fgPos, 0);
    ctx.drawImage(images.fg, fgPos - 1120, 0);	

    player.update();

    if (move.right || move.left || move.up || move.down) {
        if(player.y < safeLevel)
            particles.push(Particle(player.x, player.y));
    }

    if (beam.active) {
        beam.calculateAngle(player.x, player.y, mouseX, mouseY);
        beam.draw();
    }

    player.draw();

    healthBar.draw();

    particles.forEach(element => {
        element.draw();
    });



    bgPos += 0.5;
    fgPos += 1;

    if (bgPos == 1120) bgPos = 0;
    if (fgPos == 1120) fgPos = 0;

	window.requestAnimationFrame(step);
}

// lägg till canvas på sidan och skala om dem vid resize och scroll
let body = document.getElementsByTagName('body')[0];
body.appendChild(canvas);



