//-----------------------------------------------------------------------------
// Enemy.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// A monster who is impeding the progress of our fearless adventurer.
/// </summary>
(function (window) {
    /// <summary>
    /// How long to wait before turning around.
    /// </summary>
    var MaxWaitTime = 0.5;

    /// <summary>
    /// The speed at which this enemy moves along the X axis.
    /// </summary>
    var MoveSpeed = 64.0;

    // Local bounds used to calculate collision between enemies and the hero
    var localBounds;

    // Index used for the naming of the monsters
    var monsterIndex = 0;

    var globalTargetFPS = 17;

    var StaticTile = new Tile(null, Enum.TileCollision.Passable, 0, 0);

    function Enemy(level, position, imgMonster) {
        this.initialize(level, position, imgMonster);
    };

    Enemy.prototype = new createjs.Sprite();

    // constructor and herencia.
    Enemy.prototype.Sprite_initialize = Enemy.prototype.initialize;    

    Enemy.prototype.initialize = function (escena,guion, imgMonster) {
        var width;
        var left;
        var height;
        var top;
        var frameWidth;
        var frameHeight;

        var localSpriteSheet = new createjs.SpriteSheet({
            images: [imgMonster], //image to use
            frames: { width: 64, height: 64, regX: 32, regY: 64 },
            animations: {
                walk: [0, 9, "walk", 2],
                idle: [10, 20, "idle", 2]
            }
        });
        // starting directly at the first frame of the walk_right sequence
        this.Sprite_initialize(localSpriteSheet,21);


        this.guion = guion;
        this.paso = 0;
        this.pasos = this.guion.length;
        this.tickCount = 0;

        frameWidth = this.spriteSheet.getFrame(0).rect.width;
        frameHeight = this.spriteSheet.getFrame(0).rect.height;

        // Calculate bounds within texture size.
        width = parseInt(frameWidth * 0.35);
        left = parseInt((frameWidth - width) / 2);
        height = parseInt(frameWidth * 0.7);
        top = parseInt(frameHeight - height);
        localBounds = new XNARectangle(left, top, width, height);

        // start playing the first sequence:
        this.actuar(this.guion[this.paso]) //animate
        this.name = "Monster" + monsterIndex;
        monsterIndex++;

     };
    
    Enemy.prototype.actuar(accion) {
        /// <summary>
        /// The direction this enemy is facing and moving along the X axis.
        /// </summary>
        // 1 = right & -1 = left
        this.accion = accion
        if (accion.type="show") {
            this.x = accion.position.x;
            this.y = accion.position.y;
            return;
        }
        if (accion.type="hidde") {
            
        }
         if (accion.type=="mover") {
            if (accion.direction === 1) {
                this.gotoAndPlay("walk_h"); //animate
            }
            else {
                this.gotoAndPlay("walk"); //animate
            }
            // Move in the current direction.
            var velocity = accion.direction * MoveSpeed * elapsed;
            this.x = this.x + velocity;            
        } else {
            this.gotoAndPlay("idle");
        }
    }

    /// <summary>
    /// Paces back and forth along a platform, waiting at either end.
    /// </summary>
    Enemy.prototype.tick = function () {
        // We should normaly try here to compute the elpsed time since
        // the last update. But setTimeout/setTimer functions
        // are not predictable enough to do that. requestAnimationFrame will
        // help when the spec will be stabilized and used properly by all major browsers
        // In the meantime, we're cheating... and living in a perfect 60 FPS world ;-)
        var elapsed = globalTargetFPS / 1000;

        var posX = this.x + (localBounds.width / 2) * this.accion.direction;
        var tileX = Math.floor(posX / StaticTile.Width) - this.accion.direction;
        var tileY = Math.floor(this.y / StaticTile.Height);
        this.tickCount++
        if (this.tickCount >= this.guion[this.paso].tiempo) {
            this.tickCount = 0;
            this.paso++;
            this.accion = this.guion[this.paso];
        }
        if (this.pasos < this.paso) {
            this.actuar();
        }
     };

    window.Enemy = Enemy;
} (window));
