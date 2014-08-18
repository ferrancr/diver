//-----------------------------------------------------------------------------
// Level.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// A uniform grid of tiles with collections of gems and enemies.
/// The level owns the player and controls the game's win and lose
/// conditions as well as scoring.
/// </summary>
(function (window) {
    // To display to current FPS
    var fpsLabel;

    // Used to build the background with 3 different layers
    var backgroundSeqTile1, backgroundSeqTile2, backgroundSeqTile3;

    var PointsPerSecond = 5;

    var globalTargetFPS = 17;

    // Index used to loop inside the 8 Audio elements stored into an array
    // Used to simulate multi-channels audio
    var audioGemIndex = 0;

    var StaticTile = new Tile(null, Enum.TileCollision.Passable, 0, 0);

    function Escena(stage, contentManager, textLevel, gameWidth, gameHeight) {
        this.levelContentManager = contentManager;
        this.levelStage = stage;
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        // Entities in the level.
        this.Hero = null;
        this.Enemies = [];
        // Key locations in the level.
        this.Start = null;
        this.Exit = new Point(-1, -1);
        this.Score = 0;
        this.ReachedExit = false;
        this.IsHeroDied = false;
        // You've got 120s to finish the level
        this.TimeRemaining = 120;
        // Saving when at what time you've started the level
        this.InitialGameTime = Ticker.getTime();
        // Creating a random background based on the 3 layers available in 3 versions
        this.CreateAndAddRandomBackground();
        // Building a matrix of characters that will be replaced by the level {x}.txt
        this.textTiles = Array.matrix(15, 20, "|");
        // Physical structure of the level.
        this.tiles = Array.matrix(15, 20, "|");
        this.LoadTiles(textLevel);
    };

    /// <summary>
    /// Unloads the level content.
    /// </summary>
    Level.prototype.Dispose = function () {
        this.levelStage.removeAllChildren();
        this.levelStage.update();
        try {
            if ( enableAudio ) { this.levelContentManager.globalMusic.pause(); }
        }
        catch (err) { }
    };

    // Transforming the long single line of text into
    // a 2D array of characters
    Level.prototype.ParseLevelLines = function (levelLine) {
        for (var i = 0; i < 15; i++) {
            for (var j = 0; j < 20; j++) {
                this.textTiles[i][j] = levelLine.charAt((i * 20) + j);
            }
        }
    };

    /// <summary>
    /// Iterates over every tile in the structure file and loads its
    /// appearance and behavior. This method also validates that the
    /// file is well-formed with a player start point, exit, etc.
    /// </summary>
    /// <param name="fileStream">
    /// A string containing the tile data.
    /// </param>
    Level.prototype.LoadTiles = function (fileStream) {
        this.ParseLevelLines(fileStream);

        // Loop over every tile position,
        for (var i = 0; i < 15; i++) {
            for (var j = 0; j < 20; j++) {
                this.tiles[i][j] = this.LoadTile(this.textTiles[i][j], j, i);
            }
        }

        // Verify that the level has a beginning and an end.
        if (this.Hero == null) {
            throw "A level must have a starting point.";
        }
        if (this.Exit.x === -1 && this.Exit.y === -1) {
            throw "A level must have an exit.";
        }
    };

    /// <summary>
    /// Loads an individual tile's appearance and behavior.
    /// </summary>
    /// <param name="tileType">
    /// The character loaded from the structure file which
    /// indicates what should be loaded.
    /// </param>
    /// <param name="x">
    /// The X location of this tile in tile space.
    /// </param>
    /// <param name="y">
    /// The Y location of this tile in tile space.
    /// </param>
    /// <returns>The loaded tile.</returns>
    Level.prototype.LoadTile = function (tileType, x, y) {
        switch (tileType) {
            // Blank space                                                                                                                      
            case '.':
                return new Tile(null, Enum.TileCollision.Passable, x, y);
                break;

            // Exit                                                                                      
            case 'X':
                return this.LoadExitTile(x, y);
                break;

            // Gem                                                                                      
            case 'G':
                return this.LoadGemTile(x, y);
                break;

            // Floating platform                                                                                      
            case '-':
                return this.LoadNamedTile("Platform", Enum.TileCollision.Platform, x, y);
                break;

            // Various enemies                                                                                      
            case 'A':
                return this.LoadEnemyTile(x, y, "MonsterA");
                break;

            case 'B':
                return this.LoadEnemyTile(x, y, "MonsterB");
                break;

            case 'C':
                return this.LoadEnemyTile(x, y, "MonsterC");
                break;

            case 'D':
                return this.LoadEnemyTile(x, y, "MonsterD");
                break;

            // Platform block                                                                                      
            case '~':
                return this.LoadVarietyTile("BlockB", 2, Enum.TileCollision.Platform, x, y);
                break;

            // Passable block                                                                                      
            case ':':
                return this.LoadVarietyTile("BlockB", 2, Enum.TileCollision.Passable, x, y);
                break;

            // Player 1 start point                                                                                      
            case '1':
                return this.LoadStartTile(x, y);
                break;

            // Impassable block                                                                                      
            case '#':
                return this.LoadVarietyTile("BlockA", 7, Enum.TileCollision.Impassable, x, y);
                break;

        }
    };


    /// <summary>
    /// Instantiates a player, puts him in the level, and remembers where to put him when he is resurrected.
    /// </summary>
    Level.prototype.LoadStartTile = function (x, y) {
        if (this.Hero != null) {
            throw "A level may only have one starting point.";
        }
        this.Start = this.GetBounds(x, y).GetBottomCenter();
        return new Tile(null, Enum.TileCollision.Passable, x, y);
    };

    /// <summary>
    /// Instantiates an enemy and puts him in the level.
    /// </summary>
    Level.prototype.LoadEnemyTile = function (x, y, name, guion) {
        var position = this.GetBounds(x, y).GetBottomCenter();
        switch (name) {
            case "MonsterA":
                this.Enemies.push(new Enemy(this, guion, this.levelContentManager.imgMonsterA));
                break;
            case "MonsterB":
                this.Enemies.push(new Enemy(this, guion, this.levelContentManager.imgMonsterB));
                break;
            case "MonsterC":
                this.Enemies.push(new Enemy(this, guion, this.levelContentManager.imgMonsterC));
                break;
            case "MonsterD":
                this.Enemies.push(new Enemy(this, guion, this.levelContentManager.imgMonsterD));
                break;
        }

        return new Tile(null, Enum.TileCollision.Passable, x, y);
    };

    /// <summary>
    /// Gets the bounding rectangle of a tile in world space.
    /// </summary>   
    Level.prototype.GetBounds = function (x, y) {
        return new XNARectangle(x * StaticTile.Width, y * StaticTile.Height, StaticTile.Width, StaticTile.Height);
    };

    /// <summary>
    /// Width of level measured in tiles.
    /// </summary>
    Level.prototype.Width = function () {
        return 20;
    };

    /// <summary>
    /// Height of the level measured in tiles.
    /// </summary>
    Level.prototype.Height = function () {
        return 15;
    };


    // Create a random background based on
    // the 3 different layers available
    Level.prototype.CreateAndAddRandomBackground = function () {
        // random number between 0 & 2.
        var randomnumber = Math.floor(Math.random() * 3);

        backgroundSeqTile1 = new Bitmap(this.levelContentManager.imgBackgroundLayers[0][randomnumber]);
        backgroundSeqTile2 = new Bitmap(this.levelContentManager.imgBackgroundLayers[1][randomnumber]);
        backgroundSeqTile3 = new Bitmap(this.levelContentManager.imgBackgroundLayers[2][randomnumber]);

        this.levelStage.addChild(backgroundSeqTile1);
        this.levelStage.addChild(backgroundSeqTile2);
        this.levelStage.addChild(backgroundSeqTile3);
    };

    // Method to call once everything has been setup in the level
    // to simply start it
    Level.prototype.StartLevel = function () {
        // Adding all the enemies to the stage
        for (var i = 0; i < this.Enemies.length; i++) {
            this.levelStage.addChild(this.Enemies[i]);
        }
        // add a text object to output the current FPS:
        fpsLabel = new Text("-- fps", "bold 14px Arial", "#000");
        this.levelStage.addChild(fpsLabel);
        fpsLabel.x = this.gameWidth - 50;
        fpsLabel.y = 20;
    };

    /// <summary>
    /// Updates all objects in the world, performs collision between them,
    /// and handles the time limit with scoring.
    /// </summary>
    Level.prototype.Update = function () {
        var ElapsedGameTime = (Ticker.getTime() - this.InitialGameTime) / 1000;
        this.UpdateEnemies();
        fpsLabel.text = Math.round(Ticker.getMeasuredFPS()) + " fps";
        // update the stage:
        this.levelStage.update();
    };

    /// <summary>
    /// Animates each enemy and allow them to kill the player.
    /// </summary>
    Level.prototype.UpdateEnemies = function () {
        for (var i = 0; i < this.Enemies.length; i++) {
            this.Enemies[i].tick();
        }
    };

    window.Level = Level;
} (window));
