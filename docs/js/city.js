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
let entities = [];
let gameRun;
let score = 0;
let counterMod = 1;

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
    player.size = 16;
    player.offset = player.size / 2;
    player.draw = function() {
        if (beam.active) {
            // ctx.drawImage(images.playerDanger, this.x, this.y);
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = 'rgba(255, 55, 55, 0.5)';
            ctx.fill();
        } else if(this.y < dangerLevel) {
            // ctx.drawImage(images.playerDanger, this.x, this.y);
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = 'rgba(255, 55, 55, 0.5)';
            ctx.fill();
        } else if(this.y < warningLevel) {
            // ctx.drawImage(images.playerWarning, this.x, this.y);
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = 'rgba(200, 100, 100, 0.7)';
            ctx.fill();
        } else {
            // ctx.drawImage(images.player, this.x, this.y);
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = 'rgba(155, 155, 155, 0.9)';
            ctx.fill();
        }
        ctx.beginPath();
        ctx.rect(this.x + this.offset / 2, this.y + this.offset / 2, this.offset, this.offset);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
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

const Entity = function(x, y, character, size)
{
    const entity = {};
    entity.x = x;
    entity.y = y;
    entity.character = character || Math.random().toString(36).substr(2, 8);
    entity.size = size || 14;
    entity.tick = 0;
    entity.draw = function()
    {
        if(this.tick > 7)
            this.tick = 0;

        let static = Math.random() * 4;

        ctx.font = this.size + static + "px Courier";
        ctx.fillStyle = '#fff';
        ctx.fillText(this.character[this.tick], x + static, y + static);

        this.tick++;
    }
    return entity;
}

const Particle = function(x, y, color)
{
    let particle = {};
    particle.x = x + player.offset;
    particle.y = y + player.offset;
    particle.dy = 1 + (Math.random()*3);
    particle.dx = -1 + (Math.random()*2);
    particle.color = (color) ? color :
                    (player.y < dangerLevel || beam.active) ? "rgba(255,55,55,0.5)" :
                    (player.y < warningLevel) ? "rgba(200,100,100,0.4)" :
                    "rgba(155,155,155,0.3)";
    particle.size = 2 + Math.floor(Math.random()*2);
    particle.draw = function()
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, PI_2, false);

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
    healthBar.width = 130;
    healthBar.height = 12;
    healthBar.lastChange = "";

    healthBar.draw = function ()
    {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.health, this.height);
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.fill();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    healthBar.update = function(val)
    {
        if (this.health < this.maxHealth) {
            this.health = this.health + val;
            
            if(this.health > this.maxHealth) {
                this.health = this.maxHealth;
            }
        }
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
        ctx.moveTo(player.x + player.offset, player.y + player.offset);
        ctx.lineTo(player.x + player.offset + (this.length - 4) * Math.cos(this.angle),
                player.y + player.offset + (this.length - 4) * Math.sin(this.angle));
        ctx.lineWidth = 7;
        ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + player.offset, player.y + player.offset);
        ctx.lineTo(player.x + player.offset + (this.length - 2) * Math.cos(this.angle),
                player.y + player.offset + (this.length - 2) * Math.sin(this.angle));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + player.offset, player.y + player.offset);
        ctx.lineTo(player.x + player.offset + this.length * Math.cos(this.angle),
                player.y + player.offset + this.length * Math.sin(this.angle));
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x + player.offset, player.y + player.offset);
        ctx.lineTo(player.x + player.offset + this.static * Math.cos(this.angle),
                player.y + player.offset + this.static * Math.sin(this.angle));
        ctx.lineWidth = Math.random() * 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.stroke();

        this.static = this.static + 20;

        if (this.static > this.length)
            this.static = 0;
    }
    beam.intersect = function(a, b, c, d, p, q, r, s)
    {
        // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
        var det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
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
        case "D":
            move.right = true;
            break;
        case "A":
            move.left = true;
            break;
        case "W":
            move.up = true;
            break;
        case "S":
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
        case "D":
            move.right = false;
            break;
        case "A":
            move.left = false;
            break;
        case "W":
            move.up = false;
            break;
        case "S":
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

document.addEventListener('mousedown', function(e) {
    beam.active = true;
}, false);

document.addEventListener('mouseup', function(e) {
    beam.active = false;
}, false);

let counter = 0;
let start = null;

function step(timestamp) {
    if (!start) start = timestamp;
    let progress = timestamp - start;

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

    entities.forEach(function(element, index, object) {
        if(beam.active) {
            let hit = beam.intersect(
                player.x + player.offset,
                player.y + player.offset,
                player.x + player.offset + (beam.length - 4) * Math.cos(beam.angle),
                player.y + player.offset + (beam.length - 4) * Math.sin(beam.angle),
                element.x -2,
                element.y -2,
                element.x + 12,
                element.y + 12
            );
            if (hit) {
                object.splice(index, 1);
                healthBar.update(+3);
                score++;
                if (score % 10 == 1)
                    counterMod++;

                for(let i = 0; i < 3; i++)
                    particles.push(Particle(element.x, element.y, "rgba(255, 255, 255, 0.8)"));
            }
        }
        element.draw();
    });

    particles.forEach(element => {
        element.draw();
    });

    if(counter > 200) {
        entities.push(Entity(random(30, 1090), random(30,650)));
        counter = 0;
    }

    counter += counterMod;

    ctx.font = "14px Courier";
    ctx.fillStyle = '#fff';
    ctx.textAlign = "right";
    ctx.fillText(score, 1110, 20);

    let dateObject = new Date(progress);

    ctx.font = "14px Courier";
    ctx.fillStyle = '#fff';
    ctx.textAlign = "center";
    ctx.fillText(dateObject.getUTCMinutes() + ":" + dateObject.getUTCSeconds(), 1120 / 2, 20);

    bgPos += 0.5;
    fgPos += 1;

    if (bgPos == 1120) bgPos = 0;
    if (fgPos == 1120) fgPos = 0;

    gameRun = window.requestAnimationFrame(step);
    
    if(healthBar.health < 0 || entities.length > 10) {
        window.cancelAnimationFrame(gameRun);

        let highscore = localStorage.getItem("highscore");

        if(highscore !== null){
            if (score > highscore) {
                localStorage.setItem("highscore", score);      
            }
        }
        else{
            localStorage.setItem("highscore", score);
        }

        ctx.font = "80px Courier";
        ctx.fillStyle = 'red';
        ctx.textAlign = "center";
        ctx.fillText("DEAD", canvas.width / 2, canvas.height / 2);
        ctx.font = "20px Courier";
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText("Highscore: " + highscore, canvas.width / 2, canvas.height / 2 + 60);
    }
}

// lägg till canvas på sidan och skala om dem vid resize och scroll
let body = document.getElementsByTagName('body')[0];
body.appendChild(canvas);

function random(min,max) {
    return Math.floor(Math.random()*(max-min)) + min;
}

function randomColor() {
    var value = 500;
    var r = 50+(Math.floor(Math.random()*205));
    var g = 0;
    var b = 50+(Math.floor(Math.random()*205));
    return "rgba(" + r + "," + g + "," + b + ", 0.5)"
}