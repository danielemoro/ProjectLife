"use strict";
//constants



let game = new Game(1000);
game.run();

function Game (speed) {
  //Each cell is an array [isAlive 1 or 0, energy, klass, brain]
  //The class represents what kind of cell it is
  // A low class means the cell gains much energy every turn from sunlight
  // A high class means the cell gains no energy every turn from sunlight
  // A cell can only reproduce on lower classes. Reproduction means that the cell's class is slightly altered as well as the brain.
  // cells cannot move
  // every cell has a brain, with input of [top neighbor energy, top neighbor class, ... all neighbors] (size of 8)
  // output of brain is [energy to give to top neighbor, ... all neighbors] (size 4)
  // if energy is given to cell of lower class, that cell is killed and the original cell reproduces there
  // if energy given to cell of higher class, that energy is transferred
  // if energy is taken (negative energy) from lower class or higher class, the energy is simply taken.
  this.ENERGY_MAX = 1000;
  this.ENERGY_MIN = 0;
  this.KLASS_MAX = 100;
  this.KLASS_MIN = 0;
  this.speed = speed;
  this.running = true;
  this.xCellNum = 20;


  this.gameOfLifeRules = function (board) {
    let nextBoard = new Board(this.canvas.xMax, this.canvas.yMax);
    let boardXmax = Math.min(board.xMax, nextBoard.xMax);
    let boardYmax = Math.min(board.yMax, nextBoard.yMax);

    for (let x = 0; x < boardXmax; x++) {
      for (let y = 0; y < boardYmax; y++) {
        //game of life
        let neighbors = board.countNeighbors(x, y);
        let cell = board.getCell(x, y);
        if (cell.isAlive === 1) { //live cell
          if (neighbors < 2 || neighbors > 3) { //kill lonely or overcrowded cells
            nextBoard.getCell(x, y).isAlive = 0;
            this.canvas.drawCell(x, y, nextBoard.getCell(x, y));
          } else {
            nextBoard.getCell(x, y).isAlive = 1;
          }
        } else if (cell.isAlive === 0) { //dead cell
          if (neighbors === 3) { //create new cells
            nextBoard.getCell(x, y).isAlive = 1;
            this.canvas.drawCell(x, y, nextBoard.getCell(x, y));
          }
        }

      }
    }
    return nextBoard;
  };

  this.newRules = function (board) {
    let nextBoard = new Board(this.canvas.xMax, this.canvas.yMax);

    nextBoard.deepCopy(board);

    let boardXmax = Math.min(board.xMax, nextBoard.xMax);
    let boardYmax = Math.min(board.yMax, nextBoard.yMax);
    //console.log("TURN-------------")

    for (let x = 0; x < boardXmax; x++) {
      for (let y = 0; y < boardYmax; y++) {
        let oldcell = board.getCell(x, y);
        if (oldcell.isAlive === 0) { continue; } //skip dead cells
        //let cell = oldcell.deepCopy();
        let cell = nextBoard.getCell(x, y);

        //console.log(`START TURN FOR [${x},${y}] ${cell}`);
        cell.age = cell.age + 1;

        //adjust cell body
        if (oldcell.energy <= this.ENERGY_MIN) {
          cell.kill();
          this.canvas.drawCell(x, y, cell);
          continue;
        }

        //add energy from sun
        cell.addEnergy((1 - (oldcell.klass / this.KLASS_MAX)) * 60);

        //take away energy from living
        cell.takeEnergy(20);

        //brain in
        let pos = {above: [x, y + 1], right: [x + 1, y], bottom: [x, y - 1], left: [x - 1, y]};
        let brainInput =
          [oldcell.energy, oldcell.klass, //myself
          board.getCell(pos.above[0], pos.above[1]).energy, board.getCell(pos.above[0], pos.above[1]).klass, //above
          board.getCell(pos.right[0], pos.right[1]).energy, board.getCell(pos.right[0], pos.right[1]).klass, //right
          board.getCell(pos.bottom[0], pos.bottom[1]).energy, board.getCell(pos.bottom[0], pos.bottom[1]).klass, //bottom
          board.getCell(pos.left[0], pos.left[1]).energy, board.getCell(pos.left[0], pos.left[1]).klass,]; //left
        let brainOut = cell.runBrain(brainInput);

        //check brain out
        if (brainOut.length !== 4) {
          console.log("ERROR! incorrect brain output");
          continue;
        }

        //implement brain out
        pos = [[x, y + 1], [x + 1, y], [x, y - 1], [x - 1, y]];
        for (let i = 0; i < brainOut.length; i++) {
          let rcellOld = board.getCell(pos[i][0], pos[i][1]);

          if (brainOut[i] < 0) { //take energy
            let energyTaken = nextBoard.getCell(pos[i][0], pos[i][1]).takeEnergy(Math.abs(brainOut[i]));
            cell.addEnergy(Math.abs(energyTaken));

          } else if (brainOut[i] > 0) { //place energy
            if (rcellOld.isAlive === 0 || rcellOld.klass < oldcell.klass) { //check if can reproduce
              //console.log(`[${x},${y}] is reproducing. Giving ${brainOut[i]} energy to (${pos[i][0]},${pos[i][1]})`);
              if(cell.takeEnergy(brainOut[i]) >= brainOut[i]) {
                nextBoard.setCell(pos[i][0], pos[i][1], new Cell(1, brainOut[i], addRandomInt(cell.klass, 5), null));
              }
            } else { //if not reproduce, simply give energy
              //console.log(`[${x},${y}] is giving energy. Giving ${brainOut[i]} energy to (${pos[i][0]},${pos[i][1]})`);
              if(cell.takeEnergy(brainOut[i]) >= brainOut[i]) {
                nextBoard.getCell(pos[i][0], pos[i][1]).addEnergy(brainOut[i]);
              }
            }
          }
          //console.log(`next board: [${pos[i][0]},${pos[i][1]}] ${nextBoard.getCell(pos[i][0], pos[i][1])}`);
        }
        this.canvas.drawCell(x, y, cell);
      }
    }
    return nextBoard;
  };

  this.run = async function(){
    //init
    this.canvas = new Canvas(this.xCellNum);
    this.currBoard = new Board(this.canvas.xMax, this.canvas.yMax);
    //this.currBoard.randPopulate();
    this.canvas.drawBoard(this.currBoard);

    //Keep running
    // noinspection InfiniteLoopJS
    for (let turns = 0; ; turns++) {
      //get correct time
      let oldTime = new Date().getTime();
      while((oldTime + this.speed) >  new Date().getTime()) { await sleep(1); }
      let dif = new Date().getTime() - (oldTime + this.speed);
      //console.log(`Running ${dif} ms late`)

      //await sleep(this.speed);
      if (this.running) {
        //console.log(turns);
        //this.currBoard = this.gameOfLifeRules(this.currBoard);
        this.canvas.refreshScreen();
        this.currBoard = this.newRules(this.currBoard);
      }
    }
  };
}

function Cell(isAlive, energy, klass, mybrain){
  this.isAlive = isAlive;
  this.age = isAlive;

  if(energy > game.ENERGY_MAX) { this.energy = game.ENERGY_MAX; }
  else if (energy < game.ENERGY_MIN) { this.energy = game.ENERGY_MIN; }
  else { this.energy = energy;  }

  if(klass > game.KLASS_MAX) { this.klass = game.KLASS_MAX; }
  else if (klass < game.KLASS_MIN) { this.klass = game.KLASS_MIN; }
  else { this.klass = klass;  }

  this.mybrain = mybrain;

  this.clear = function(){
    this.isAlive = 0;
    this.energy = 0;
    this.klass = 0;
    this.mybrain = null;
  };

  this.kill = function(){
    this.isAlive = 0;
  };

  this.checkIfAlive = function(){
    if(this.energy <= 0) {
      this.kill();
    }
  };

  this.runBrain = function(input) {
    if (input[0] > 100) {
      return [20, 20, 20, 20];
    } else {
      return [0,0,-15,0];
      if(input[7] > 90) return [0,0,-20,0];
      else return [0,0,0,0];
    }
  };

  this.takeEnergy = function(amount) {
    if(this.energy - amount >= game.ENERGY_MIN){
      this.energy = this.energy - amount;
      this.checkIfAlive();
      return amount;
    } else {
      let amountDif = this.energy - game.ENERGY_MIN;
      this.energy = game.ENERGY_MIN;
      this.checkIfAlive();
      return amountDif;
    }
  };

  this.addEnergy = function(amount) {
    //console.log(`Adding ${amount} energy to ${this.energy}`);
    if(this.energy + amount <= game.ENERGY_MAX){
      this.energy = this.energy + amount;
    } else {
      this.energy = game.ENERGY_MAX;
    }
    this.checkIfAlive();
  };

  this.deepCopy = function(){
    let cell = new Cell(this.isAlive, this.energy, this.klass, this.mybrain); //TODO make deep copy of brain
    cell.age = this.age;
    return cell;
  };

  this.toString = function(){
    return `Cell: age: ${this.age}, alive ${this.isAlive}, energy ${this.energy}, klass ${this.klass}, brain ${this.mybrain}`;
  }

}

function Board (xMax, yMax) {
  this.setupBoard = function() {
    for (let i = 0; i < this.xMax; i++) {
      let cols = [];
      for (let j = 0; j < this.yMax; ++j) {
        cols[j] = new Cell(0,0,0,null);
      }
      this.board[i] = cols;
    }
  };

  this.deepCopy = function(board){
    for (let x = 0; x < this.xMax; x++) {
      for (let y = 0; y < this.yMax; y++) {
        if(board.getCell(x,y).isAlive === 1)
          this.setCell(x,y, board.getCell(x,y).deepCopy());
      }
    }
  };

  this.clearBoard = function() {
    for (let x = 0; x < this.xMax; x++) {
      for (let y = 0; y < this.yMax; y++) {
        this.getCell(x,y).clear();
      }
    }
  };

  this.getCell = function (x, y) {
    if(x > this.xMax - 1 || x < 0) return new Cell(0,0,0,null);
    if(y > this.yMax - 1 || y < 0) return new Cell(0,0,0,null);
    //console.log(`Getting [${x}, ${y}] and the maxes are [${this.xMax}, ${this.yMax}] `)
    return this.board[x][y];
  };

  this.setCell = function (x, y, cell) {
    if(x > this.xMax - 1 || x < 0) return;
    if(y > this.yMax - 1 || y < 0) return;
    this.board[x][y] = cell;
  };

  this.countNeighbors = function(x, y){
    let totalCount = 0;
    totalCount += x>0 && y>0 ?  this.getCell(x-1, y-1).isAlive : 0; //topleft
    totalCount += y>0 ?  this.getCell(x, y-1).isAlive : 0; //top
    totalCount += x<(this.xMax-1) && y>0 ?  this.getCell(x+1, y-1).isAlive : 0; //topRight
    totalCount += x>0 ?  this.getCell(x-1, y).isAlive : 0; //left
    totalCount += x<(this.xMax-1) ?  this.getCell(x+1, y).isAlive : 0; //right
    totalCount += x>0 && y<(this.yMax-1) ? this.getCell(x-1,y+1).isAlive : 0; //bottomRight
    totalCount += y<(this.yMax-1) ?  this.getCell(x,y+1).isAlive : 0; //bottom
    totalCount += x<(this.xMax-1) && y<(this.yMax-1) ?  this.getCell(x+1,y+1).isAlive : 0; //bottomRight
    return totalCount;
  };

  this.randPopulate = function() {
    //set random start cells
    let startCells = (this.xMax*this.yMax)/10;
    for (let i = 0; i < startCells; i++) {
      this.getCell(getRandomInt(this.xMax-1), getRandomInt(this.yMax-1)).isAlive = 1;
    }
  };

  this.xMax = xMax;
  this.yMax = yMax;
  this.board = [];
  this.setupBoard();
}

function Canvas (yMax) {
  let self = this;

  this.init = function() {
    this.clientWidth = Math.max(window.innerWidth, document.documentElement.clientWidth);
    this.clientHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
    this.NUM_BUTTONS = 3;
    this.BUTTON_HEIGHT = this.clientHeight * 0.05;
    this.BUTTON_WIDTH = (this.clientWidth - 100) / this.NUM_BUTTONS;
    this.CELL_COLOR = "#ffffff";
    this.BACK_COLOR = "#000000";
    this.BORDER_WIDTH = 1;

    this.isPopulating = true;
    this.isShowingInfoPanel = false;

    this.canvas = document.getElementById("myCanvas");
    this.playButton = document.getElementById("playButton");
    this.resetButton = document.getElementById("resetButton");
    this.populateButton = document.getElementById("populateButton");
    this.cvs = this.canvas.getContext("2d");

    this.cvs.canvas.height = this.clientHeight - this.BUTTON_HEIGHT - 20;
    this.cvs.canvas.width = this.clientWidth - 20;
    this.yMax = yMax;
    this.cellHeight = this.cvs.canvas.height / this.yMax;
    this.cellWidth = this.cellHeight;
    this.xMax = Math.trunc(this.cvs.canvas.width / this.cellWidth);

    //make buttons pretty
    this.playButton.style = `height:${this.BUTTON_HEIGHT}px;width:${this.BUTTON_WIDTH}px`;
    this.resetButton.style = `height:${this.BUTTON_HEIGHT}px;width:${this.BUTTON_WIDTH}px`;
    this.populateButton.style = `height:${this.BUTTON_HEIGHT}px;width:${this.BUTTON_WIDTH}px`;
  };
  self.init();


  this.drawCell = function(x, y, cell){
    //draw surrounding square
    this.cvs.fillStyle=self.BACK_COLOR;
    this.cvs.fillRect((x * this.cellWidth), (y * this.cellHeight ), this.cellWidth, this.cellHeight);

    let brightness = cell.energy / game.ENERGY_MAX;
    let klassColor = cell.klass / game.KLASS_MAX;
    let cellColor = rgbToHex((brightness*0.5 + klassColor*0.5) * 255,
                             (brightness*0.5 + Math.abs(1-klassColor)*0.5) * 255,
                             (brightness) * 255);
    //draw cell
    if(cell.isAlive === 1) {
      this.cvs.fillStyle = cellColor;
      this.cvs.fillRect((x * this.cellWidth) + self.BORDER_WIDTH, (y * this.cellHeight ) + self.BORDER_WIDTH,
                        this.cellWidth - (2* self.BORDER_WIDTH), this.cellHeight - (2* self.BORDER_WIDTH));
    }

    //draw info panel
    if(self.isShowingInfoPanel && this.infoPanelxCell === x &&  this.infoPanelyCell === y) {
      self.updateInfo();
    }

  };

  this.refreshScreen = function(){
    //clean square
    this.cvs.fillStyle=self.BACK_COLOR;
    this.cvs.fillRect(0, 0, this.cvs.canvas.width, this.cvs.canvas.height);
  };

  this.drawBoard = function(board){
    this.refreshScreen();

    for(let i = 0; i < board.xMax; i++) {
      for(let j = 0; j < board.yMax; j++) {
        this.drawCell(i, j, board.getCell(i,j))
      }
    }
  };

  this.drawInfo = function(xCell, yCell, cell) {
    self.infoPanelxCell = xCell;
    self.infoPanelyCell = yCell;
    self.infoPanel = document.querySelector("#infoPanel");
    self.infoPanel.hidden = false;
    self.infoPanel.style.transform = `translate3d(${xCell * this.cellWidth}px, ${yCell * this.cellHeight}px, 0)`;
    self.infoPanel.innerHTML = cell;
  };

  this.hideInfo = function() {
    let infoPanel = document.querySelector("#infoPanel");
    infoPanel.hidden = true;
  };

  this.updateInfo = function() {
    self.infoPanel.innerHTML = game.currBoard.getCell(self.infoPanelxCell, self.infoPanelyCell);
  };

  this.getMousePos = function (evt) {
    let rect = this.canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  };

  this.resizeCanvas = function() {
    game.running = false;
    self.init();
    game.running = true;
    self.drawBoard(game.currBoard)
  };

  window.addEventListener('resize', this.resizeCanvas, false);
  window.addEventListener('orientationchange', this.resizeCanvas, false);


  //Handle mouse events
  this.canvas.addEventListener('mousemove', function(evt) {
    if(self.mouseDown){
      if(self.isPopulating) {
        let mousePos = self.getMousePos(evt);
        let xCell = Math.trunc(mousePos.x / self.cellWidth);
        let yCell = Math.trunc(mousePos.y / self.cellHeight);
        let cell = game.currBoard.getCell(xCell, yCell);
        cell.isAlive = 1;
        cell.addEnergy(100);
        self.drawCell(xCell, yCell, cell);
      }
    }
  }, false);

  this.canvas.onmousedown = function(e) {
    self.mouseDown = true;
    if (!self.isPopulating) {
      if (self.isShowingInfoPanel) {
        self.isShowingInfoPanel = false;
        self.hideInfo();
      } else {
        let mousePos = self.getMousePos(e);
        let xCell = Math.trunc(mousePos.x / self.cellWidth);
        let yCell = Math.trunc(mousePos.y / self.cellHeight);
        let cell = game.currBoard.getCell(xCell, yCell);
        self.drawInfo(xCell, yCell, cell);
        self.isShowingInfoPanel = true;
      }
    }
  };

  this.canvas.onmouseup = function(e) {
    self.mouseDown = false;
  };

  this.playButton.onclick = function(){
    if(game.running) {
      game.running = false;
      self.playButton.value = "Play"
    } else {
      game.running = true;
      self.playButton.value = "Pause"
    }
  };

  this.resetButton.onclick = function(){
    game.running = false;
    game.currBoard.clearBoard();
    self.drawBoard(game.currBoard);
    game.running = true;
  };

  this.populateButton.onclick = function(){
    if(self.isPopulating) {
      self.isPopulating = false;
      self.populateButton.value = "Infoing"
    } else {
      self.isPopulating = true;
      self.populateButton.value = "Populating"
    }
  };

  document.body.onkeyup = function(e){
    switch(e.key){
      case " ":
        game.running = !game.running;
        break;

      case "c":
        game.currBoard.clearBoard();
        self.drawBoard(game.currBoard);
        break;

      case "p":
        game.currBoard.randPopulate();
        self.drawBoard(game.currBoard);
        break;

      case "ArrowLeft":
        game.speed += (game.speed / 2);
        console.log("Speed: " + game.speed);
        break;

      case "ArrowRight":
        game.speed -= (game.speed / 2);
        console.log("Speed: " + game.speed);
        break;

      default:
        return;
    }
  };
}






