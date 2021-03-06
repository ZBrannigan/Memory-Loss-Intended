var GameStateHandler = {};
var game = new Phaser.Game(1024, 576, Phaser.AUTO);
var map;
var lightTexture;
var lightSprite;
var buttonpressed;
var text;
var style;
var hintStyle;
var names = ["Prisoner"];
var prisonersGroup;
var prisonerArray;
var computersGroup;
var computerArray;
var enemiesGroup;
var enemiesArray;
var camerasGroup;
var cameraArray;
var player;
var PLAYER_SPEED = 150;
var firstFreePrisoner;
var prisonerStoryList;
var gameOverTip = "";
var stepSound, alertSound, deadSound, menuMusic, backgroundMusic;

var debuggingSecondStage = false;
var guardsHidden = false;
var camerasHidden = true;
var behind = false; //whether the prisoners will follow slightly behind the player or go directly to them

var stageFrom;

class KeyBinds{
    constructor(){
        //prevents keys from affecting browser
        game.input.keyboard.addKeyCapture([Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.UP, Phaser.Keyboard.DOWN,
                                           Phaser.Keyboard.SPACEBAR, Phaser.Keyboard.ENTER,
                                           Phaser.Keyboard.W, Phaser.Keyboard.A, Phaser.Keyboard.S, Phaser.Keyboard.D]);
        //actually tracks keys
        this.cursors = game.input.keyboard.createCursorKeys();
        this.enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        this.spacebarKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        this.w = game.input.keyboard.addKey(Phaser.Keyboard.W);
        this.a = game.input.keyboard.addKey(Phaser.Keyboard.A);
        this.s = game.input.keyboard.addKey(Phaser.Keyboard.S);
        this.d = game.input.keyboard.addKey(Phaser.Keyboard.D);
    }
    up(){
        return this.cursors.up.isDown || this.w.isDown;
    }
    down(){
        return this.cursors.down.isDown || this.s.isDown;
    }
    right(){
        return this.cursors.right.isDown || this.d.isDown;
    }
    left(){
        return this.cursors.left.isDown || this.a.isDown;
    }
    direction(){
        return this.up()||this.down()||this.right()||this.left();
    }
    call(){
        return this.spacebarKey.justPressed() || this.enterKey.justPressed();
    }
    clear(){
        return this.spacebarKey.justPressed();
    }
}

class Player{
    constructor(x, y){
        this.light = new LightSource(this, 250, 50, 22);
        //Creating the player sprite
        var player = game.add.sprite(x, y, 'player');
        //Setting up the sprite as a physical body in Arcade Physics Engine
        game.physics.arcade.enable(player);
        player.frame = 75;
        player.anchor.setTo(0.5, 0.5);
        player.body.collideWorldBounds = true;
        player.animations.add('moving', Phaser.Animation.generateFrameNames('survivor-move_flashlight_', 0, 19), 60, true);
        this.sprite = player;
        
        game.input.addMoveCallback(function(pointer, x, y){
            if(this.sprite.body.velocity.x == 0 && this.sprite.body.velocity.y == 0) this.pointTo(x + game.camera.x, y + game.camera.y);
        }, this);

        game.camera.follow(this.sprite);
    }
    update() {
        //make the player move
        this.sprite.body.velocity.x = 0;
        this.sprite.body.velocity.y = 0;
        if (keys.left()) {
            this.sprite.body.velocity.x = -PLAYER_SPEED;
            this.sprite.animations.play('moving');
        } else if (keys.right()) {
            this.sprite.body.velocity.x = PLAYER_SPEED;
            this.sprite.animations.play('moving');
        }
        if (keys.up()) {
            this.sprite.body.velocity.y = -PLAYER_SPEED;
            this.sprite.animations.play('moving');
            if (this.sprite.body.velocity.x != 0) {
                this.sprite.body.velocity.x *= Math.sqrt(2) / 2;
                this.sprite.body.velocity.y *= Math.sqrt(2) / 2;
            }
        } else if (keys.down()) {
            this.sprite.body.velocity.y = PLAYER_SPEED;
            this.sprite.animations.play('moving');
            if (this.sprite.body.velocity.x != 0) {
                this.sprite.body.velocity.x *= Math.sqrt(2) / 2;
                this.sprite.body.velocity.y *= Math.sqrt(2) / 2;
            }
        }
        if (keys.direction()) {
            stepSound.play('', 0.25, 0.5, false, false);//plays stepping sounds
            this.sprite.angle = Math.atan(this.sprite.body.velocity.y / this.sprite.body.velocity.x) * 180 / Math.PI;
            if (this.sprite.body.velocity.x < 0) this.sprite.angle += 180;
        } else {
            stepSound.stop();
            this.sprite.animations.stop();
        }

        
    }
    pointTo(x,y){
        this.sprite.angle = directionTo(this, x, y);
    }
    getX(){
        return this.sprite.x;
    }
    getY(){
    }
    getX(){
        return this.sprite.x;
    }
    getY(){
        return this.sprite.y;
    }
    getAngle(){
        return this.sprite.angle;
    }
}

class Story{
    constructor(message, truth, hint, gameOverMessage){
        this.message = message;
        this.truth = truth;
        this.hint = hint;
        this.GOM = gameOverMessage;
    }
}

class StoryList{
    constructor(){
        //setting global variable in a place where it makes sense, and near where it matters
        style = {
            font: "16px Helvetica",
            strokeThickness:1.5,
            wordWrap: true,
            wordWrapWidth: 300,
            fill:"rgba(17, 68, 294, 0.9)",
            stroke:"rgba(80,60,20,0.35)",
        };
        hintStyle = {
            font: "12px Times New Roman",
            wordWrap: true,
            wordWrapWidth: 300,
            fill:"rgba(220, 220, 220, 0.9)",
            stroke:"rgba(255,255,255,0.2)",
        };
    }
    reset(){
        this.list = [];
        this.list.push(new Story("I clicked on an interesting link on Facebook that a friend of mine posted. It gave my computer a virus. " +
                                "It turns out their profile was hacked.", false,
                                "-They describe that it was 'The 5 Most Interesting Things on the Internet'\n" +
                                "-They tell you that the virus erased all of the files on their hard drive.",
                                "Look for information that really verifies the story someone tells you. Most anyone could think of a fake " +
                                "title, and they only even *told* you that their hard drive was erased. If either was true, they'd be able " +
                                "to show you a screwed-up hard drive and probably a real link to a virus from their profile. " +
                                "Try to trust people who have things that are much harder to fabricate before you trust someone like this!")); //"www.facebook/link1356#1445/5-Most-interesting-things-on-Internet")); // I don't know if we should have an actual link to a supposed virus
        this.list.push(new Story("I got a call from the IRS. They asked me to give them my personal information. I verified the caller ID " +
                                "online and it was actually their number. They must have found a way around my caller ID, since it didn't turn " + 
                                "out they were really the IRS.", false,
                                "-The number is actually from the IRS.\n" +
                                "-They tell me the address they gave to the scammer. It's a real house.",
                                "Does it actually confirm their story to find that they know the IRS's phone number, or that they know an address of a house?\n" +
                                "Anyone can look up the IRS's phone number online, and anyone can find a random house in a similar fashion. " +
                                "Try to trust people who have things that are much harder to fabricate before you trust someone like this!"));
        this.list.push(new Story("I bought NBA playoff tickets off CraigList. The guy told me he was unable to attend becuase he was " +
                                "assigned overtime all of the sudden that day. The tickets looked real but didn't scan. The contact information he provided was bogus", true,
                                "-I see the tickets in their hand, and they look real.\n" +
                                "-I called the number they provided, and it was disconnected. I verified with the a phone company that it has been disconnected since around " +
                                "the correct time.",
                                "This is not supposed to have led you to a game over. Sorry, it's a bug."));
        this.list.push(new Story("I met a girl online. We wanted to meet but she said she did not have the money, " +
                                "so I wired it to her. I never heard from her again.", true,
                                "-The fake girl's dating website profile, and another profile by the same name on Facebook, were deleted shortly after the incident.\n" +
                                "-They show me a bank statement on the bank's website, with the wire transfer on it.",
                                "This is not supposed to have led you to a game over. Sorry, it's a bug."));
        this.list.push(new Story("I got a call in the middle of the day saying that my friend was kidnapped. " +
                                "I tried to negotiate a price because I was scared for him. I wired them money, but later I found out " +
                                "my friend was not in any sort of trouble.", true,
                                "-They describe their friends visual appearance appropriately, and when I call them, they confirm the story.\n" +
                                "-They show the bank statement showing the details of the transaction, on the bank's website.",
                                "This is not supposed to have led you to a game over. Sorry, it's a bug."));
        this.list.push(new Story("I was told that I could make a lot of money working for a company if I paid an entry fee. " +
                                "The only job I would need to do was recruit more people. In the end, it was just a pyramid scheme.", true,
                                "-The company has a full website. This person has a page on that website.\n" +
                                "-There's contact info for everyone they recruited before dropping out. I contacted some of them at random. " + 
                                "They relayed similar stories, and provided their name when asked.",
                                "This is not supposed to have led you to a game over. Sorry, it's a bug."));
    }
    getRandom(){
        return this.list.splice(Math.floor(Math.random()*this.list.length), 1)[0];
    }
}

class Prisoner{
    constructor(x, y, frame) {
        this.sprite = prisonersGroup.create(x, y, 'Prisoner', frame);
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.scale.setTo(0.45);
        this.sprite.body.immovable = true;

        this.accepted = false;
        this.free = true;//'am I already going to or at a computer? if not, I'm free'

        this.story = prisonerStoryList.getRandom();
        this.name = frame;

        this.index = -1;

        this.roundCornerRadius = 7;
        prisonerArray.push(this);
    }
    makeText(){
        this.background = game.add.graphics();

        this.text = game.add.text(0, 0, this.story.message, style);
        this.text.anchor.setTo(1, 1);
        
        this.hint = game.add.text(0, 0, "Hint:\n" + this.story.hint, hintStyle);
        this.hint.anchor.setTo(1, 1);
        
        this.buttonA = game.add.button(0, 0, "accept", this.accept, this, 0, 1, 2);
        this.buttonD = game.add.button(0, 0, "deny", this.deny, this, 0, 1, 2);
        this.buttonD.anchor.setTo(1, 0);
        this.buttonA.alpha = 0.9;
        this.buttonD.alpha = 0.9;

        this.background.width = this.text.width + this.hint.width + 4*this.roundCornerRadius;
        this.background.alpha = 0.9;

        this.stopText();
    }
    showText(){
        if(!this.accepted){
            this.background.reset();
            this.text.reset();
            this.hint.reset();
            this.buttonA.reset();
            this.buttonD.reset();

            this.text.x = Math.floor(Math.min(Math.max(this.sprite.x + (this.text.width/2), this.roundCornerRadius + this.text.width), game.world.width - this.roundCornerRadius));
            this.text.y = Math.floor(Math.min(Math.max(this.sprite.y - this.sprite.height - this.buttonA.height - this.roundCornerRadius - 15, this.text.height + this.roundCornerRadius), game.world.height - this.buttonA.height - this.roundCornerRadius));

            this.hint.x = this.text.x + this.hint.width + (this.roundCornerRadius*2);
            this.hint.y = this.text.y;
            //place hint box on the left if it doesn't fit on the right
            if(this.hint.x + this.roundCornerRadius > game.width + game.camera.x){
                this.hint.x = this.text.x - this.text.width - (this.roundCornerRadius*2);
            }

            this.background.x = Math.min(this.text.x - this.text.width, this.hint.x - this.hint.width) - this.roundCornerRadius;
            this.background.y = Math.min(this.text.y - this.text.height, this.hint.y - this.hint.height) - this.roundCornerRadius;

            this.background.clear();
            //rect around text box
            this.background.beginFill(0x88AACC);
            this.background.drawRoundedRect(Math.max(0, (this.text.x - this.text.width) - (this.hint.x - this.hint.width)), Math.max(0, this.hint.height - this.text.height),
                this.text.width + (this.roundCornerRadius*2),
                this.text.height + (this.roundCornerRadius*2),
                this.roundCornerRadius);
            this.background.endFill();

            //rect around hint box
            this.background.beginFill(0x102940);
            this.background.drawRoundedRect(Math.max(0, (this.hint.x - this.hint.width) - (this.text.x - this.text.width)), Math.max(0, this.text.height - this.hint.height),
                this.hint.width + (this.roundCornerRadius*2),
                this.hint.height + (this.roundCornerRadius*2),
                this.roundCornerRadius);
            this.background.endFill();

            this.buttonA.x = this.text.x - this.text.width;
            this.buttonD.x = this.text.x;
            this.buttonA.y = this.text.y + this.roundCornerRadius;
            this.buttonD.y = this.text.y + this.roundCornerRadius;
        }
    }
    stopText(){
        this.background.kill();
        this.text.kill();
        this.hint.kill();
        this.buttonA.kill();
        this.buttonD.kill();
    }
    accept(){
        if(!this.story.truth){
            gameOverTip = this.story.GOM;
            game.state.start("GameOver");
        }
        game.world.remove(this.background);
        game.world.remove(this.text);
        game.world.remove(this.hint);
        game.world.remove(this.buttonA);
        game.world.remove(this.buttonD);
        this.accepted = true;
    }
    deny(){
        this.stopText();
    }
    followPlayer(){
        if(this.index != -1 && this.free){
            if(this.tween && this.tween._hasStarted){
                this.tween.stop();
                this.path = findPath(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
                this.doPath(false);
            } else {
                //if I don't do this, and/or have the "timing" variable set to 0, you can spam press enter and the prisoners will start bugging out because
                //it adds tweens without fully getting rid of the ones that are supposed to have stopped
                if(this.tween && this.tween.isRunning) return;

                this.path = findPath(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
                this.doPath(true);
            }
        }
    }
    doPath(delay){
        if(this.path.length > 0){
            //pathing http://www.html5gamedevs.com/topic/6569-move-a-sprite-along-a-path/
            //turns out the way they do it there is pretty shit in a lot of ways
            var timing;
            if(delay) timing = this.index * 200;
            else timing = 15;

            var p = this.path.shift();
            //this.previousPoint = {x: this.sprite.x, y: this.sprite.y};
            this.tween = game.add.tween(this.sprite).to(p, distance(p.x, p.y, this.sprite.x, this.sprite.y) * 8, null, false, timing);
            var recur = function(){
                if(this.path.length > 0){
                    var p = this.path.shift();
                    //this.previousPoint = {x: this.sprite.x, y: this.sprite.y};
                    this.tween = game.add.tween(this.sprite).to(p, distance(p.x, p.y, this.sprite.x, this.sprite.y) * 8);
                    this.tween.onComplete.addOnce(recur, this);
                    this.tween.start();
                }
            }
            this.tween.onComplete.addOnce(recur, this);
            this.tween.start();
        }
    }
    getX(){
        return this.sprite.x;
    }
    getY(){
        return this.sprite.y;
    }
    getAngle(){
        return this.sprite.angle;
    }
    stageTwo(i){
        this.index = i;
        var x = 64 + ((i%2)*64);
        var y = 448;
        if(i > 1) y += 64;
        this.sprite = prisonersGroup.create(x, y, 'Prisoner', this.name);
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.scale.setTo(0.45);
        this.sprite.body.immovable = true;
        console.log(this);
    }
}

class Computer{
    constructor(x, y){
        this.sprite = game.add.sprite(x, y, "computer");
        game.physics.arcade.enable(this.sprite);
        this.sprite.body.immovable = true;
        computersGroup.add(this.sprite);
        computerArray.push(this);
        
        this.free = true;
    }
    check(index){
        var prisoner = prisonerArray[index];
        if(this.free && prisoner.free){//I don't think the second condition is ever going to be false, because of the location I'm calling this from, but might as well check
            var path = findPath(prisoner.getX(), prisoner.getY(), this.sprite.x, this.sprite.y, map);
            if(path.length < 3){
                this.free = false;
                prisoner.free = false;
                index++;
                for(var i = index; i < prisonerArray.length; i++){
                    prisonerArray[i].index = i - index;
                }
                prisoner.tween.stop();
                prisoner.path = path;
                if(behind)prisoner.path.push({x:this.sprite.x, y:this.sprite.y});
                prisoner.doPath(false);
            }
        }
        return index;
    }
}

class Guard{
    constructor(x, y){
        this.sprite = enemiesGroup.create(x, y, 'guard');
        this.sprite.anchor.setTo(0.5, 0.5);
        this.dir = 0;
        game.physics.arcade.enable(this.sprite);
        this.sprite.body.collideWorldBounds = true;
        this.sprite.body.immovable = true;
        this.sprite.animations.add('movingdown', Phaser.Animation.generateFrameNames('down', 1, 4), 5, true);
        this.sprite.animations.add('movingleft', Phaser.Animation.generateFrameNames('left', 1, 4), 5, true);
        this.sprite.animations.add('movingright', Phaser.Animation.generateFrameNames('right', 1, 4), 5, true);
        this.sprite.animations.add('movingup', Phaser.Animation.generateFrameNames('up', 1, 4), 5, true);
        enemiesArray.push(this);

        this.light = new LightSource(this, 225, 50, 8);

        this.psSprite = game.add.sprite(0, 0, "seen");
        this.psSprite.anchor.setTo(0.5, 0.5);
        this.psSprite.scale.setTo(0.5, 0.5);
        this.psSprite.kill();

        this.timer = null;
    }
    update(){
        //check if the player is visible; if they are, start a timer...
        //if the timer goes off, game over, but the timer gets closer and closer to reset as the player spends time out of sight
        if(this.light.visible(player)){
            if(this.psSprite.alive){
                this.psSprite.x=this.sprite.x;
                this.psSprite.y=this.sprite.y-40;
            } else this.psSprite.reset(this.sprite.x, this.sprite.y-40);
            if(this.timer == null){
                alertSound.play('', 0, 0.2, false,false);
                this.timer = game.time.now;
            } else if (game.time.now - this.timer > 1000){
                deadSound.play('', 0, 0.5, false, false);
                gameOverTip = "You were seen by a guard!"
                game.state.start("GameOver")
            }
        } else {
            if(this.psSprite.alive)this.psSprite.kill();
            //if you were just seen, it should take less time than normal to notice you completely, but after a bit it'll reset.
            //I don't know why but 100 just seems like the right number after a bit of testing.
            if(this.timer != null && this.timer < game.time.now){
                this.timer += 100;
            } else {
                //IT'S HERE -- at this point, the guard is "reset" to the usual 1 second grace period. I'll also reformat the camera part slightly to match, if you want to do something there
                this.timer = null;
            }
        }
    }
    down(){
        this.dir = 90;
        this.sprite.frame = 0;
        this.sprite.animations.play('movingdown');
        this.sprite.body.velocity.y = 60;
    }
    left(){
        this.dir = 180;
        this.sprite.frame = 8;
        this.sprite.animations.play('movingleft');
        this.sprite.body.velocity.x = -60;
    }
    right(){
        this.dir = 0;
        this.sprite.frame = 10;
        this.sprite.animations.play('movingright');
        this.sprite.body.velocity.x = 60;
    }
    up(){
        this.dir = -90;
        this.sprite.frame = 12;
        this.sprite.animations.play('movingup');
        this.sprite.body.velocity.y = -60;
    }
    getX(){
        return this.sprite.x;
    }
    getY(){
        return this.sprite.y;
    }
    getAngle(){
        return this.dir;
    }

}

class CameraEnemy{
    constructor(x, y, arcStart, arcEnd){
        this.light = new LightSource(this, 200, 45, 8);
        this.sprite = camerasGroup.create(x, y, "camera");
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.angle = arcEnd;

        if(arcStart == arcEnd) this.speed = 0;
        else this.speed = 1/150;

        this.state = 0;
        this.arcStart = arcStart;
        this.arcEnd = arcEnd;
        this.timer1 = Math.random()*150;

        cameraArray.push(this);

        this.timer2 = null;

        if(debuggingSecondStage){
            this.myNumber = cameraArray.length;
            this.style = {
                font: "32px Helvetica",
                strokeThickness:2,
                fill:"rgb(255, 255, 255)",
                stroke:"rgb(0,0,0)",
            };
        }
    }
    update(){
        if(debuggingSecondStage && this.myText == undefined){
            this.myText = game.add.text(this.sprite.x, this.sprite.y, ""+this.myNumber, this.style);
            this.myText.anchor.setTo(0.5, 0.5);
        }
        if(this.psSprite == undefined){
            this.psSprite = game.add.sprite(0, 0, "seen");
            this.psSprite.anchor.setTo(0.5, 0.5);
            this.psSprite.scale.setTo(0.5, 0.5);
            this.psSprite.kill();
        }

        if(this.state == 0){
            this.timer1 += 1;
            if(this.timer1 > 150){
                this.timer1 = 0;
                if(this.sprite.angle < this.arcStart) this.state = (this.arcEnd - this.arcStart)*this.speed;
                else this.state = (this.arcStart - this.arcEnd)*this.speed;
                this.sprite.angle += this.state;
            }
        } else {
            this.sprite.angle += this.state;
            if(this.sprite.angle < this.arcStart || this.sprite.angle > this.arcEnd) this.state = 0;
        }

        var seen = false;
        for(var i = firstFreePrisoner; i < prisonerArray.length; i++){
            if(this.light.visible(prisonerArray[i])){
                seen = true;
                break;
            }
        }
        if(this.light.visible(player) || seen){
            if(!this.psSprite.alive) this.psSprite.reset(this.sprite.x, this.sprite.y);
            if(this.timer2 == null){
                if(!debuggingSecondStage) alertSound.play('', 0, 0.2, false,false);
                this.timer2 = game.time.now;
            } else if (game.time.now - this.timer2 > 1000 && !debuggingSecondStage){
                deadSound.play('', 0, 0.2, false, false);
                gameOverTip = "Your group was seen by a camera! Make sure you don't lead your friends into view of the cameras either. You can see where they're pointing when you look at them."
                game.state.start("GameOver");
            }
        } else {
            if(this.psSprite.alive) this.psSprite.kill();
            //if you were just seen, it should take less time than normal to notice you completely, but after a bit it'll reset.
            //I don't know why but 100 just seems like the right number after a bit of testing.
            if(this.timer2 != null && this.timer2 < game.time.now){
                this.timer2 += 100;
            } else {
                this.timer2 = null;
            }
        }
    }
    pointTo(x,y){
        this.sprite.angle = directionTo(this, x, y);
    }
    getX(){
        return this.sprite.x;
    }
    getY(){
        return this.sprite.y;
    }
    getAngle(){
        return this.sprite.angle;
    }
}

class LightSource{
    constructor(emittingObj, lightStrength, spread, resolution){
        this.source = emittingObj;
        this.arcWidth = spread;
        this.strength = lightStrength;
        this.resolution = resolution;
    }
    draw(){
        //prototype I guess
        var sX = this.source.getX();
        var sY = this.source.getY();
        var handLength = (this.source.sprite.width + this.source.sprite.height)/5;
        sX += Math.cos(this.source.getAngle()*Math.PI/180)*handLength;
        sY += Math.sin(this.source.getAngle()*Math.PI/180)*handLength;

        if(map.getTile(Math.floor(sX/32), Math.floor(sY/32))) return;

        var points = [];
        var startAngle = this.source.getAngle() - (this.arcWidth/2);
        var endAngle = startAngle + this.arcWidth;

        for(var currentAngle = startAngle; currentAngle <= endAngle; currentAngle += this.arcWidth / this.resolution){
            points.push(getWallIntersection(new Phaser.Line(sX, sY, sX + Math.cos(currentAngle*Math.PI/180)*this.strength, sY + Math.sin(currentAngle*Math.PI/180)*this.strength), false));
            
        }
        var g = lightTexture.context.createRadialGradient(sX, sY, this.strength * 0.5, sX, sY, this.strength);
        g.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        lightTexture.context.fillStyle = g;
        
        lightTexture.context.beginPath();
        lightTexture.context.moveTo(sX, sY);
        for(var i = 0; i < points.length; i++){
            lightTexture.context.lineTo(points[i].x, points[i].y);
        }
        lightTexture.context.lineTo(sX, sY);
        lightTexture.context.stroke();
        lightTexture.context.fill();
        //lightTexture.dirty = true;
    }
    
    visible(target){
        var sX = this.source.getX();
        var sY = this.source.getY();
        var tX = target.getX();
        var tY = target.getY();

        //within range?
        if(distance(sX, sY, tX, tY) > this.strength) return false;

        //set up angles to check...
        var angleDiff;
        if(sX == tX){
            if(sY == tY)return true;
            if(sY > tY) angleDiff = -90;
            else angleDiff = 90
        } else{
            angleDiff = Math.atan((sY-tY)/(sX-tX))*180/Math.PI;
        }

        //within arc of sight?
        var portAng = this.source.getAngle() - (this.arcWidth/2);
        var starboardAng = portAng + this.arcWidth;
        if(sX > tX){
            portAng = correctAngle(portAng);
            starboardAng = correctAngle(starboardAng);
        }
        if(angleDiff < portAng || angleDiff > starboardAng) return false;

        //anything in the way?
        return !(getWallIntersection(new Phaser.Line(sX, sY, tX, tY), true));
    }
}

function stopSounds(){
    menuMusic.stop();
    backgroundMusic1.stop();
    backgroundMusic2.stop();
    stepSound.stop();
    alertSound.stop();
    deadSound.stop();
}

function doLights(){
    lightTexture.context.fillStyle = "rgba(0, 0, 0, 0.95)";
    lightTexture.context.strokeStyle = 'rgba(255, 255, 255, 0.0)'
    lightTexture.context.fillRect(game.camera.x, game.camera.y, game.width, game.height);
    for(var i = 0; i < arguments.length; i++){
        if(arguments[i].length != undefined){
            for(var j = 0; j < arguments[i].length; j++){
                arguments[i][j].light.draw();
            }
        } else {
            arguments[i].light.draw();
        }
    }
    lightTexture.dirty = true;
}

function makeMap(ref, bg) {
    //creating the map (I feel like maybe this should go in its own class, but it might take more work than the other things)
    var m = game.add.tilemap(ref);
    game.add.image(0, 0, bg);
    game.world.setBounds(0, 0, m.widthInPixels, m.heightInPixels);
    return m;
}

function makeCameras(){
    camerasGroup = game.add.group();
    new CameraEnemy(144, 48, 15, 120);//1
    new CameraEnemy(240, 944, -165, -15);//2
    new CameraEnemy(432, 432, 15, 75);//3
    new CameraEnemy(432, 806, -15, 75);//4
    new CameraEnemy(688, 48, 15, 165);//5
    new CameraEnemy(688, 240, 10, 95);//6
    new CameraEnemy(816, 752, 170, 170);//7
    new CameraEnemy(976, 624, 50, 165);//8
    //new CameraEnemy(1040, 432, 45, 135);//9 // this one is just unfair... (if you go debug this, all the numbers ahead of this are 1 too high in the comments)
    new CameraEnemy(1136, 912, -75, 75);//10
    new CameraEnemy(1456, 48, 15, 165);//11
    new CameraEnemy(1456, 240, 75, 170);//12
    new CameraEnemy(1488, 624, 15, 165);//13
    new CameraEnemy(1552, 432, 40, 165);//14
    new CameraEnemy(1552, 880, 60, 165);//15
    new CameraEnemy(2000, 208, 105, 165);//16

}

function makeEnemies(){
    enemiesGroup = game.add.group();
    enemiesGroup.enableBody = true;
    new Guard(740, 265).down();
    new Guard(1110, 260).down();
    new Guard(1210, 290).right();
    new Guard(170, 260).left();
}

function findContainingObject(sprite, array){
    for(var i = 0; i < array.length; i++){
        if(array[i].sprite === sprite) return array[i];
    }
    return null;
}

function directionTo(source, x, y){
        var d;
        if(source.getX() == x){
            d = Math.PI/2;
            if(source.getY() > y) d = -(Math.PI/2);
        }else{
            d = Math.atan((source.getY()-y)/(source.getX()-x));
        }
        d *= 180/Math.PI;
        if(source.getX() > x) return d + 180;
        return d;
}

//I think with reeeeeally big arc widths, this might screw up occasionally? don't think it matters since we're never going to use numbers >180 degrees
//this is for the light source calculation of whether or not something is within the arc of vision
function correctAngle(angle){
    if(angle > 0)return angle - 180;
    return angle + 180;
}

function distance(x1, y1, x2, y2){
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

function getWallIntersection(ray, boolean) {
    var distanceToWall = Number.POSITIVE_INFINITY;
    var closestIntersection = {x:ray.end.x, y:ray.end.y};
    //vertical lines
    var loopEnds = {x:Math.ceil(Math.max(ray.start.x, ray.end.x) / 32), y:Math.ceil(Math.max(ray.start.y, ray.end.y) / 32)};
    if(ray.end.x - ray.start.x != 0){
        var slope = (ray.end.y - ray.start.y) / (ray.end.x - ray.start.x);
        for (var i = Math.ceil(Math.min(ray.start.x, ray.end.x) / 32); i < loopEnds.x; i++) {
            var intersectY = slope * ((i*32) - ray.start.x) + ray.start.y;
            var yTile = Math.floor(intersectY / 32);
            if (intersectY >= 0 && yTile < map.height && (map.getTile(i, yTile) != null || map.getTile(Math.max(i-1, 0), yTile) != null)) {
                if(boolean) return true;
                dist = distance(ray.start.x, ray.start.y, i*32, intersectY);
                if (dist < distanceToWall) {
                    distanceToWall = dist;
                    closestIntersection = {x:i*32, y:intersectY};
                }
            }
        }
    }
    //horizontal lines
    if(ray.end.y - ray.start.y != 0){
        var slope = (ray.end.x - ray.start.x) / (ray.end.y - ray.start.y);
        for (var i = Math.ceil(Math.min(ray.start.y, ray.end.y) / 32); i < loopEnds.y; i++) {
            var intersectX = slope * ((i*32) - ray.start.y) + ray.start.x;
            var xTile = Math.floor(intersectX / 32);
            if (intersectX >= 0 && xTile < map.width && (map.getTile(xTile, i) != null || map.getTile(xTile, Math.max(i-1, 0)) != null)) {
                if(boolean) return true;
                dist = distance(ray.start.x, ray.start.y,  intersectX, i*32);
                if (dist < distanceToWall) {
                    distanceToWall = dist;
                    closestIntersection = {x:intersectX, y:i*32};
                }
            }
        }
    }
    if(boolean) return false;
    return closestIntersection;
    
}

function showText(player, prisoner){
    findContainingObject(prisoner, prisonerArray).showText();
}

function findPath(worldSX, worldSY, worldEX, worldEY){
    var start = worldPosToTilePos(worldSX, worldSY, map);
    start.gScore = 0;
    start.from = {x:start.x, y:start.y};

    var end = worldPosToTilePos(worldEX, worldEY, map);

    var explored = [];
    for(var i = 0; i < map.height; i++){
        explored.push([]);
        for(var j = 0; j < map.width; j++){
            explored[i].push(null);
        }
    }
    var exploring = [start];
    var curr, from, adj;
    while(exploring.length > 0){
        curr = exploring.shift();
        explored[curr.y][curr.x] = {x:curr.from.x, y:curr.from.y};
        if(curr.x == end.x && curr.y == end.y){
            var path = [explored[end.y][end.x]];
            //I know this is really unclear, but I like how it fits in one line
            while(path[0].x != start.x || path[0].y != start.y) path.unshift(explored[path[0].y][path[0].x]);
            path.shift();
            for(var i = 0; i < path.length; i++){
                path[i].x = (path[i].x * 32) + 16;
                path[i].y = (path[i].y * 32) + 16;
            }
            if(!behind) path.push({x:worldEX, y:worldEY});
            return path;
        }
        adj = adjacentTiles(curr, explored);
        for(var i = 0; i < adj.length; i++){
            var insert = true;
            for(var j = 0; j < exploring.length; j++){
                if(exploring[j].x == adj[i].x && exploring[j].y == adj[i].y){
                    insert = adj[i].gScore < exploring[j].gScore;
                    if(insert){
                        exploring.splice(j, 1);
                    }
                    break;
                }
            }
            if(insert){
                adj[i].from = {x:curr.x, y:curr.y};
                adj[i].fScore = Math.abs(end.x - adj[i].x) + Math.abs(end.y - adj[i].y) + adj[i].gScore;
                for(var j = 0; j <= exploring.length; j++){
                    if(j == exploring.length){
                        exploring.push(adj[i]);
                        break;
                    }
                    if(exploring[j].fScore > adj[i].fScore){
                        exploring.splice(j, 0, adj[i]);
                        break
                    }
                }
            }
        }
    }
    return [];
}

function adjacentTiles(tile, explored){
    var ret = [];
    //make sure each adjacent tile is within the bounds of the map, not a wall, and hasn't been explored, before adding it to return values
    if(tile.x + 1 < map.width && map.getTile(tile.x+1, tile.y) == null && explored[tile.y][tile.x+1] == null)
        ret.push({gScore:tile.gScore+1, x:tile.x+1, y:tile.y});
    if(tile.y + 1 < map.height && map.getTile(tile.x, tile.y+1) == null && explored[tile.y+1][tile.x] == null)
        ret.push({gScore:tile.gScore+1, x:tile.x, y:tile.y+1});
    if(tile.x - 1 >= 0 && map.getTile(tile.x-1, tile.y) == null && explored[tile.y][tile.x-1] == null)
        ret.push({gScore:tile.gScore+1, x:tile.x-1, y:tile.y});
    if(tile.y - 1 >= 0 && map.getTile(tile.x, tile.y-1) == null && explored[tile.y-1][tile.x] == null)
        ret.push({gScore:tile.gScore+1, x:tile.x, y:tile.y-1});
    //diagonals
    if(tile.x - 1 >= 0 && tile.y - 1 >=0 && map.getTile(tile.x-1, tile.y-1) == null && map.getTile(tile.x-1, tile.y) == null && map.getTile(tile.x, tile.y-1) == null && explored[tile.y-1][tile.x-1] == null)
        ret.push({gScore:tile.gScore+Math.sqrt(2), x:tile.x-1, y:tile.y-1});
    if(tile.x - 1 >= 0 && tile.y + 1 < map.height && map.getTile(tile.x-1, tile.y+1) == null && map.getTile(tile.x-1, tile.y) == null && map.getTile(tile.x, tile.y+1) == null && explored[tile.y+1][tile.x-1] == null)
        ret.push({gScore:tile.gScore+Math.sqrt(2), x:tile.x-1, y:tile.y+1});
    if(tile.x + 1 < map.width && tile.y - 1 >=0 && map.getTile(tile.x+1, tile.y-1) == null && map.getTile(tile.x+1, tile.y) == null && map.getTile(tile.x, tile.y-1) == null && explored[tile.y-1][tile.x+1] == null)
        ret.push({gScore:tile.gScore+Math.sqrt(2), x:tile.x+1, y:tile.y-1});
    if(tile.x + 1 < map.width && tile.y + 1 < map.height && map.getTile(tile.x+1, tile.y+1) == null &&map.getTile(tile.x+1, tile.y) == null &&map.getTile(tile.x, tile.y+1) == null && explored[tile.y+1][tile.x+1] == null)
        ret.push({gScore:tile.gScore+Math.sqrt(2), x:tile.x+1, y:tile.y+1});
    return ret;
}

function worldPosToTilePos(worldX, worldY, map){
    //needs work (get actual tile width/height from the object instead of just knowing it's 32)
    return {x:Math.floor(worldX / 32), y:Math.floor(worldY / 32)}
}

function changeAnimation(enemySprite, wall){
    var enemy = findContainingObject(enemySprite, enemiesArray);

    if(enemySprite.animations.currentAnim.name == "movingdown") enemy.up();
    else if(enemySprite.animations.currentAnim.name == "movingup") enemy.down();
    else if(enemySprite.animations.currentAnim.name == "movingright") enemy.left();
    else enemy.right();
}

function stopAnimation(player, enemySprite){
    gameOverTip = "You ran right into a guard.";
    deadSound.play();
    game.state.start("GameOver");

    /*enemySprite.body.velocity.x = 0;
    enemySprite.body.velocity.y = 0;
    enemySprite.animations.stop();
    if(enemySprite.animations.currentAnim.name == "movingdown") enemySprite.frame = 0;
    if(enemySprite.animations.currentAnim.name == "movingup") enemySprite.frame = 12;
    if(enemySprite.animations.currentAnim.name == "movingleft") enemySprite.frame = 8;
    if(enemySprite.animations.currentAnim.name == "movingright") enemySprite.frame = 9;*/
}

function stageComplete(){
    var numAccountedFor = 0;
    for(var i = 0; i < prisonerArray.length; i++){
        if(!prisonerArray[i].story.truth || prisonerArray[i].accepted){
            numAccountedFor++;
            if(!prisonerArray[i].story.truth && prisonerArray[i].accepted){
                return false;
            }
        }
    }
    return numAccountedFor == prisonerArray.length;
}

GameStateHandler.Preloader = function() {};
GameStateHandler.Preloader.prototype = {
    preload: function() {
        console.log('Preloader: preload');
        //using this area for loading all assets

        //setting path for loads to assets, since loading is for assets :thinking:
        this.load.path = 'assets/';

        //in-game objects
        this.load.atlas('player', 'atlas.png', 'atlas.json');
        this.load.image('prisoner', 'prisoner1.png');//uhhhhhhh
        this.load.atlas('Prisoner', 'PTest.png', 'PTest.json');//which one of these are we using?
        this.load.image('computer' , 'computer.png');
        this.load.atlas('guard', 'guard.png', 'guards.json');
        this.load.image('camera', 'Camera.png');
        this.load.image('seen', 'Seen.png');//except this, this is just the sprite for when something sees you

        //for prisoner stories
        this.load.spritesheet('accept', 'acceptBtn.png', 125, 50);
        this.load.spritesheet('deny', 'denyBtn.png', 125, 50);

        //map-related loads
        this.load.tilemap('map', 'GameMap.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.tilemap('map2', 'GameMapStage2.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.image('Background1', 'FloorBackgroundBigger.png');
        this.load.image('Background2', 'FloorBackgroundVertical.png');
        
        //menu-related loads
        this.load.image('Menu_Background', 'Menu_Background.png');
        this.load.image('button', 'grey_button.png');
        this.load.bitmapFont('font_game', "font_game.png", "font_game.fnt")
        this.load.audio('menu',['menuMusic2.ogg']);

        //music
        //BGM2 IS SECOND STAGE MUSIC ... they're both the same now, but we can change it and whatever...
        this.load.audio('bgm',['bgm1.ogg']);
        this.load.audio('bgm2',['bgm4.ogg']);

        //in-game sounds
        this.load.audio('steps',['steps.ogg']);
        this.load.audio('alert',['alert2.mp3']);
        this.load.audio('dead',['alert1.mp3'])

    },
    create: function() {
        console.log('Preloader: create');
        //using this area to set up the things we need globally set up
        keys = new KeyBinds(); //set up keyboard input
        prisonerStoryList = new StoryList(); //create story list for choosing story objects from

        //set up music vars
        menuMusic = game.add.audio('menu');
        backgroundMusic1 = game.add.audio('bgm');
        backgroundMusic2 = game.add.audio('bgm2');
        stepSound = game.add.audio('steps');
        alertSound = game.add.audio('alert');
        deadSound = game.add.audio('dead');
    },
    update: function() {
        this.state.start('Menu');
    }
};


function wordWrapBitmapText(text, size, wrapWidth){
    if(text.length == 0){
        return text;
    }
    var maxChars = Math.floor(wrapWidth / size);
    var subs = text.split("\n");
    var ret = "";
    if(subs.length > 1){
        for(var i = 0; i < subs.length; i++){
            ret += wordWrapBitmapText(subs[i], size, wrapWidth);
            ret += "\n";
        }
        return ret;
    }
    subs = text.split(" ");
    for(var i = 0; i < subs.length; i++){
        if(subs[i].length > maxChars){
            subs.splice(i, 1, subs[i].substr(0, maxChars), subs[i].substr(maxChars));
        }
    }
    var lineLength = subs[0].length;
    ret += subs[0];
    for(var i = 1; i < subs.length; i++){
        if(lineLength + subs[i].length > maxChars){
            ret += "\n";
            lineLength = subs[i].length + 1;
        } else {
            ret += " ";
            lineLength += subs[i].length + 1;
        }
        ret += subs[i];
    }
    return ret;
}

GameStateHandler.Menu = function() {
    var button_play, button_options, textplay, textopt;
};
GameStateHandler.Menu.prototype = {
    preload: function() {
        if(!menuMusic.isPlaying) menuMusic.play('', 0, 0.25, true);
    },
    create: function() {
        var menuBackground = this.add.image(0,0, 'Menu_Background');
        menuBackground.alpha = 0.35;

        button_play = game.add.button(game.width/2, 200, 'button', this.actionOnClickplay, this);
        button_play.anchor.setTo(0.5, 0.5);
        textplay = game.add.bitmapText(button_play.x, button_play.y, "font_game", 'PLAY', 20);
        textplay.anchor.setTo(0.5, 0.5);

        button_options = game.add.button(game.width/2, button_play.y + button_play.height + 20, 'button',  this.actionOnClickopt, this);
        button_options.anchor.setTo(0.5, 0.5);
        textopt = game.add.bitmapText(button_options.x, button_options.y, "font_game", 'HELP', 20);
        textopt.anchor.setTo(0.5, 0.5);
        if(!menuMusic.isPlaying) menuMusic.play('', 0, 0.15, true);

        stageFrom = 0;

    },
    update: function() {},
    actionOnClickplay: function() {
        menuMusic.stop();
        this.state.start('Stage1');
    },
    actionOnClickopt: function() {
        this.state.start('Options_Screen');
    }
};

GameStateHandler.Options_Screen = function() {
  var button_back, text_back, game_description, game_controls;
};
GameStateHandler.Options_Screen.prototype = {
    create: function() {
        var Menu_backGround = this.add.image(0,0, 'Menu_Background');
        Menu_backGround.alpha = 0.35;
        game_controls = "Controls:\n\tUse the ARROW KEYS or WASD to move.\n\tWhile standing still, use the MOUSE to aim your flashlight.\n\t" +
                        "Walk into prisoners to talk to them.\n\tAfter reaching stage two, ENTER or SPACEBAR will call prisoners to you.\n\tIn stage two, bring prisoners to their computers!";
        game_description = "Info:\n\tYou're trapped in a strange cyber prison where nobody can tell who's who. You know some of your friends are trapped here too, but " +
                           "there are also disguised cyber guards who are impersonating them! You need to find out who's a guard and who's a friend, doing your best to " +
                           "verify which people truly did get scammed and sent here, and which are making their stories up. Oh, and be careful of cameras and guards-- " +
                           "if you or a prisoner gets seen walking around, you're dead meat!";
        game_description = wordWrapBitmapText(game_description, 9, 700);

        button_back = game.add.button(game.width/2, game.height - 60, 'button', this.actionOnClickback, this);
        text_back = game.add.bitmapText(button_back.x, button_back.y, 'font_game', 'BACK', 20);
        button_back.anchor.setTo(0.5, 0.5);
        text_back.anchor.setTo(0.5, 0.5);

        var title_text = game.add.bitmapText(game.width/2, 40, 'font_game', "Controls and Information", 28)
        var controls_text = game.add.bitmapText(game.width/2, 80, 'font_game', game_controls, 20);
        var descp_text = game.add.bitmapText(controls_text.x, controls_text.y + controls_text.height + 40, 'font_game', game_description, 20);
        controls_text.x -= descp_text.width/2;
        title_text.anchor.setTo(0.5, 0.5);
        descp_text.anchor.setTo(0.5, 0);

    },
    actionOnClickback: function() {
       this.state.start('Menu');
    }

};
GameStateHandler.Stage1 = function() {
};
GameStateHandler.Stage1.prototype = {
    preload: function() {
        console.log('Stage1: preload');
        game.load.image('tiles', 'Tiles.png'); //loading tileset image
        prisonerStoryList.reset();
        stopSounds();
        backgroundMusic1.play('', 0, 0.25, true);
    },
    create: function() {
        stageFrom = 1;
        console.log('Stage1: create');
        game.time.advancedTiming = true;
        game.physics.startSystem(Phaser.Physics.ARCADE);
        map = makeMap('map', 'Background1');

        prisonerArray = [];
        enemiesArray = [];

        //creating prisoners
        prisonersGroup = game.add.group();
        prisonersGroup.enableBody = true;
        new Prisoner(80, 115, 'Prisoner1');
        new Prisoner(430, 475, 'Prisoner2');
        new Prisoner(940, 95, 'Prisoner3');
        new Prisoner(1245, 155, 'Prisoner4');
        new Prisoner(1300, 480, 'Prisoner5');
        new Prisoner(1960, 280, 'Prisoner6');

        //creating guards
        if(guardsHidden) makeEnemies();

        //creating texture for shadows/light
        lightTexture = game.add.bitmapData(map.widthInPixels, map.heightInPixels);
        lightSprite = game.add.image(0, 0, lightTexture);
        lightSprite.blendMode = Phaser.blendModes.MULTIPLY;

        if(!guardsHidden) makeEnemies();

        //create player
        player = new Player(208, 496);

        //finish making map because the walls have to appear above the shadow/light layer so you can see them
        map.addTilesetImage('Tiles', 'tiles');
        groundLayer = map.createLayer('TileLayer'); //creating a layer
        groundLayer.resizeWorld();
        map.setCollisionByExclusion([], true, groundLayer); // the old function that was here was bugging me since it just used an arbitrarily large number

        //set up the text objects for prisoners (also has to appear above shadow/light layer)
        for(var i = 0; i < prisonerArray.length; i++){
            prisonerArray[i].makeText();
        }
    },
    update: function() {
        if(stageComplete()){
            game.state.start("Stage2");
        }

        game.physics.arcade.collide(player.sprite, groundLayer);
        game.physics.arcade.collide(player.sprite, prisonersGroup, showText);
        game.physics.arcade.collide(enemiesGroup, groundLayer, changeAnimation);
        game.physics.arcade.collide(player.sprite, enemiesGroup, stopAnimation);

        for(var i = 0; i < enemiesArray.length; i++){
            enemiesArray[i].update();
        }

        lightTexture.context.clearRect(game.camera.x, game.camera.y, game.width, game.height);
        doLights(player, enemiesArray);

        if(keys.call() && debuggingSecondStage){
            for(var i = 0; i < prisonerArray.length; i++){
                prisonerArray[i].accepted = prisonerArray[i].story.truth;
            }
            game.state.start("Stage2");
        }

        if (keys.direction()){
            for(var i = 0; i < prisonerArray.length; i++){
                prisonerArray[i].stopText();
            }
        }
        player.update();
   }
};
GameStateHandler.Stage2 = function() {
};
GameStateHandler.Stage2.prototype = {
    preload: function() {
        console.log('Stage2: preload');
        stopSounds();
        backgroundMusic2.play('', 0, 0.25, true);
    },
    create: function() {
        console.log('Stage2: create');
        game.time.advancedTiming = true;
        game.physics.startSystem(Phaser.Physics.ARCADE);
        map = makeMap("map2", 'Background2');

        for(var i = 0; i < map.width; i++){
            for(var j = 0; j < map.height; j++){
                if(map.getTile(i, j) != null){
                    if(map.getTile(i, j).index == 1 || map.getTile(i, j).index == 2){
                        console.log("x: " + ((i*32)+16) + " y: " + ((j*32)+16));
                    }
                }
            }
        }

        cameraArray = [];
        computerArray = [];

        //creating cameras
        camerasGroup = game.add.group();
        if(camerasHidden) makeCameras();

        //creating texture for shadows/light
        lightTexture = game.add.bitmapData(map.widthInPixels, map.heightInPixels);
        lightSprite = game.add.image(0, 0, lightTexture);
        lightSprite.blendMode = Phaser.blendModes.MULTIPLY;

        if(!camerasHidden) makeCameras();

        computersGroup = game.add.group();
        new Computer(128, 320);
        new Computer(128, 640);
        new Computer(512, 320);
        new Computer(640, 864);
        new Computer(1568, 320);
        new Computer(1760, 992);

        //remake prisoners in their group and such
        prisonersGroup = game.add.group();
        prisonersGroup.enableBody = true;
        prisonerArray = prisonerArray.filter(function(prisoner){
            return prisoner.accepted;
        });
        for(var i = 0; i < prisonerArray.length; i++){
            prisonerArray[i].stageTwo(i);
        }
        console.log(prisonerArray);

        //create player
        player = new Player(100, 496);

        //finish making map because the walls have to appear above the shadow/light layer so you can see them
        map.addTilesetImage('TileSet', 'tiles');
        groundLayer = map.createLayer('TileLayer'); //creating a layer
        groundLayer.resizeWorld();
        map.setCollisionByExclusion([], true, groundLayer); // the old function that was here was bugging me since it just used an arbitrarily large number


        //set up the text objects for prisoners (also has to appear above shadow/light layer)
        for(var i = 0; i < prisonerArray.length; i++){
            prisonerArray[i].makeText();
        }

        //return to this stage again if you lose and hit the retry button
        stageFrom = 2;

        //to keep track of how many prisoners have found their computers
        firstFreePrisoner = 0;
    },
    update: function() {
        game.physics.arcade.collide(player.sprite, groundLayer);
        game.physics.arcade.collide(player.sprite, camerasGroup);
        game.physics.arcade.collide(player.sprite, computersGroup);

        for(var i = 0; i < cameraArray.length; i++){
            cameraArray[i].update();
        }
        
        
        for(var i = 0; i < computerArray.length; i++){
            if(firstFreePrisoner >= prisonerArray.length) break;
            firstFreePrisoner = computerArray[i].check(firstFreePrisoner);
        }
        if(firstFreePrisoner == prisonerArray.length){
            game.physics.arcade.collide(prisonerArray[firstFreePrisoner - 1].sprite, computersGroup, function(){game.state.start("WinScreen");})
        }
        
        lightTexture.context.clearRect(game.camera.x, game.camera.y, game.width, game.height);
               
        //show lights just for cameras in sight (if they're hidden, otherwise show all lights)
        if(camerasHidden){
            var camsInSight = [];
            for(var i = 0; i < cameraArray.length; i++){
                if(player.light.visible(cameraArray[i])) camsInSight.push(cameraArray[i]);
            }
            doLights(player, camsInSight);
        } else doLights(player, cameraArray);
        
        if(keys.call()){
            for(var i = 0; i < prisonerArray.length; i++){
                prisonerArray[i].followPlayer();
            }
        }
        player.update();
   }
};
GameStateHandler.GameOver = function() {
    var button_menu, text_menu, button_retry, text_retry;
};
GameStateHandler.GameOver.prototype = {
    preload: function(){
        stopSounds();
    },
    create: function() {
        var menu_background = this.add.image(0,0, 'Menu_Background');
        menu_background.alpha = 0.35;
        button_menu = game.add.button(game.width/2, game.height - 60, 'button', function() {
            this.state.start('Menu');
        }, this);
        button_menu.anchor.setTo(0.5, 0.5);
        text_menu = game.add.bitmapText(button_menu.x, button_menu.y, 'font_game', 'MAIN MENU', 20);
        text_menu.anchor.setTo(0.5, 0.5);

        button_retry = game.add.button(game.width/2, button_menu.y - button_menu.height - 20, 'button', function() {
            if(stageFrom == 1){
                this.state.start('Stage1');
            } else if(stageFrom == 2){
                for(var i = 0; i < prisonerArray.length; i++){
                    prisonerArray[i].free = true;
                }
                this.state.start('Stage2');
            } else{
                console.log("something's broken");
                this.state.start('Menu');
            }
        }, this);
        button_retry.anchor.setTo(0.5, 0.5);
        text_retry = game.add.bitmapText(button_retry.x, button_retry.y, 'font_game', 'TRY AGAIN?', 20);
        text_retry.anchor.setTo(0.5, 0.5);
        
        game.add.bitmapText(game.width/2, 40, 'font_game', "Game Over!", 28).anchor.setTo(0.5, 0.5);

        gameOverTip = wordWrapBitmapText(gameOverTip, 10, 550);
        game.add.bitmapText(game.width/2, game.height/2, 'font_game', gameOverTip, 20).anchor.setTo(0.5, 0.5);
    },
    update: function() {}
};
GameStateHandler.WinScreen = function() {
    var button_menu, text_menu, button_retry, text_retry;
};
GameStateHandler.WinScreen.prototype = {
    preload: function(){
        stopSounds();
    },
    create: function() {
        var menu_background = this.add.image(0,0, 'Menu_Background');
        menu_background.alpha = 0.35;
        button_menu = game.add.button(game.width/2, game.height - 60, 'button', function() {
            this.state.start('Menu');
        }, this);
        button_menu.anchor.setTo(0.5, 0.5);
        text_menu = game.add.bitmapText(button_menu.x, button_menu.y, 'font_game', 'RETURN TO MENU', 20);
        text_menu.anchor.setTo(0.5, 0.5);
        
        game.add.bitmapText(game.width/2, 40, 'font_game', "You Win!", 28).anchor.setTo(0.5, 0.5);
        var winText = wordWrapBitmapText("Congratulations, everyone got out OK!\n\nYour captive buddies have started taking steps towards undoing the effects of the scams that caused them so much trouble.", 16, 500);
        game.add.bitmapText(game.width/2, game.height/2, 'font_game', winText, 32).anchor.setTo(0.5, 0.5);
    },
    update: function() {}
};
game.state.add('Preloader', GameStateHandler.Preloader);
game.state.add('Menu', GameStateHandler.Menu);
game.state.add('Options_Screen', GameStateHandler.Options_Screen);
game.state.add('Stage1', GameStateHandler.Stage1);
game.state.add('Stage2', GameStateHandler.Stage2);
game.state.add('GameOver', GameStateHandler.GameOver);
game.state.add('WinScreen', GameStateHandler.WinScreen);
game.state.start('Preloader');