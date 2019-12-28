let isEnd = false;
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight
});
document.body.appendChild(app.view);

app.loader
  .add("background", "/img/background.png")
  .add("minion_red", "/img/minion-red.png")
  .add("minion_blue", "/img/minion-blue.png")
  .add("castle_red", "/img/castle-red.png")
  .add("castle_blue", "/img/castle-blue.png")
  .add("ground", "/img/ground.png")
  .load((loader, resources) => {
    // This creates a texture from a 'minion_red.png' image

    const groundY = window.innerHeight - 80;
    const backgroundImage = new PIXI.Sprite(resources.background.texture);

    backgroundImage.width = window.innerWidth;
    backgroundImage.height = window.innerHeight;
    backgroundImage.x = 0;
    backgroundImage.y = 0;

    app.stage.addChild(backgroundImage);

    const ground = new PIXI.Sprite(resources.ground.texture);

    ground.width = window.innerWidth;
    ground.height = 177;
    ground.x = 0;
    ground.y = window.innerHeight;
    ground.anchor.y = 1;

    app.stage.addChild(ground);

    class Castle {
      get hp() {
        return this._hp;
      }
      set hp(newHp) {
        this._hp = newHp;
        this.hpView.text = "♥" + newHp;
      }
      get money() {
        return this._money;
      }
      set money(newMoney) {
        this._money = newMoney;
        this.moneyView.text = "$" + newMoney;
      }
      get x() {
        return this.view.x;
      }
      constructor({ camp }) {
        this.camp = camp;
        this._hp = 30000;
        this._money = 0;
        this.minion = {
          hp: 300,
          speed: 5,
          attack: 100
        };
        this.hpView = new PIXI.Text("♥" + this._hp, {
          fontFamily: "DungGeunMo",
          fontSize: 56,
          fill: 0xff1010,
          align: "center"
        });
        this.moneyView = new PIXI.Text("$" + this._money, {
          fontFamily: "DungGeunMo",
          fontSize: 56,
          fill: 0x1010ff,
          align: "center"
        });
        this.stop = false;

        if (this.camp === "red") {
          this.view = new PIXI.Sprite(resources.castle_red.texture);
          this.view.anchor.x = 0.5;
          this.view.x = 30;
          this.hpView.anchor.x = 0;
          this.hpView.x = 30;
          this.moneyView.anchor.x = 0;
          this.moneyView.x = 30;
        }
        if (this.camp === "blue") {
          this.view = new PIXI.Sprite(resources.castle_blue.texture);
          this.view.anchor.x = 0.5;
          this.view.x = window.innerWidth - 30;
          this.hpView.anchor.x = 1;
          this.hpView.x = window.innerWidth - 30;
          this.moneyView.anchor.x = 1;
          this.moneyView.x = window.innerWidth - 30;
        }
        this.view.anchor.y = 1;
        this.view.y = groundY;
        this.hpView.y = 10;
        this.moneyView.y = 70;

        app.stage.addChild(this.view);
        app.stage.addChild(this.hpView);
        app.stage.addChild(this.moneyView);
      }
    }

    class Player {
      constructor({ socket, dir, camp, castle }) {
        this.socket = socket;
        this.dir = dir;
        this.camp = camp;
        this.castle = castle;
      }
    }

    class Minion {
      remove() {
        app.stage.removeChild(this.view);
        minions.splice(minions.indexOf(this), 1);
      }
      get x() {
        return this.view.x;
      }
      set x(newX) {
        this.view.x = newX;
      }
      get angle() {
        return this.view.angle;
      }
      set angle(newAngle) {
        this.view.angle = newAngle;
      }
      constructor({ player, hp, attack, speed }) {
        this.player = player;
        this.hp = hp;
        this.attack = attack;
        this.speed = speed;
        this.angleDir = 1;

        if (this.player.camp === "red") {
          this.view = new PIXI.Sprite(resources.minion_red.texture);
          this.view.x = 0;
        }
        if (this.player.camp === "blue") {
          this.view = new PIXI.Sprite(resources.minion_blue.texture);
          this.view.x = window.innerWidth;
        }

        this.view.alpha = 0.9;
        this.view.scale.x = (0.5 * this.attack) / 100;
        this.view.scale.y = (0.5 * this.attack) / 100;

        if (this.player.dir > 0) {
          this.view.scale.x *= -1;
        }

        // Setup the position of the minion_red
        this.view.y = groundY;

        // Rotate around the center
        this.view.anchor.x = 0.5;
        this.view.anchor.y = 1;

        app.stage.addChild(this.view);
      }
    }

    const castles = [new Castle({ camp: "red" }), new Castle({ camp: "blue" })];

    const players = [
      new Player({ dir: 1, camp: "red", castle: castles[0] }),
      new Player({ dir: -1, camp: "blue", castle: castles[1] })
    ];

    const minions = [];

    window.addEventListener("keydown", e => {
      if (e.keyCode == "37") {
        // left arrow
        minions.push(
          new Minion({
            player: players[0],
            ...players[0].castle.minion
          })
        );
      } else if (e.keyCode == "39") {
        // right arrow
        minions.push(
          new Minion({
            player: players[1],
            ...players[1].castle.minion
          })
        );
      }
    });

    // Add the minion_red to the scene we are building

    // Listen for frame updates
    app.ticker.add(delta => {
      if (isEnd) return;
      // each frame we spin the minion_red around a bit
      minions.forEach(minion => {
        minion.x += delta * minion.speed * minion.player.dir;
        minion.view.angle += minion.angleDir * delta * minion.speed;
        if (minion.view.angle > 10) {
          minion.view.angle = 10;
          minion.angleDir = -1;
        }
        if (minion.view.angle < -10) {
          minion.view.angle = -10;
          minion.angleDir = 1;
        }

        const enemies = minions.filter(enemy => {
          return minion.player !== enemy.player;
        });

        enemies.some(enemy => {
          if (enemy.x - minion.x < 25 && enemy.x - minion.x > 0) {
            enemy.hp -= minion.attack;
            minion.hp -= enemy.attack;

            enemy.x -= 30 * enemy.player.dir;
            minion.x -= 30 * minion.player.dir;

            return true;
          }
        });

        const myCastle = castles.find(castle => {
          return castle === minion.player.castle;
        });
        const enemyCastle = castles.filter(castle => castle !== myCastle)[0];
        if (enemyCastle.x - minion.x < 25 && enemyCastle.x - minion.x > 0) {
          enemyCastle.hp -= minion.attack;
          minion.x -= 50 * minion.player.dir;

          if (enemyCastle.hp <= 0) {
            isEnd = true;
            socket.emit("screen:gameEnd", { camp: minion.player.camp });
            location.href = "./over-" + minion.player.camp + ".html";
          }
        }

        if (minion.hp <= 0) {
          minion.remove();
        }
      });
    });

    const socket = io("http://localhost:4747");
    socket.emit("setDevice", "screen");
    socket.emit("screen:recruit");

    const sendPlayerInformation = player => {
      const castle = player.castle;
      socket.emit("screen:info", {
        id: player.socket,
        info: {
          camp: player.camp,
          money: castle.money,
          castle: castle.hp,
          attack: castle.minion.attack,
          hp: castle.minion.hp,
          speed: castle.minion.speed
        }
      });
    };

    socket.on("screen:newPlayer", ({ id }) => {
      console.log(id);
      const isRed = players.length % 2 === 0 ? true : false;
      const player = new Player({
        socket: id,
        camp: isRed ? "red" : "blue",
        dir: isRed ? 1 : -1,
        castle: isRed ? castles[0] : castles[1]
      });
      players.push(player);
    });

    socket.on("screen:keyDown", ({ id, key }) => {
      console.log({ id, key });
      const player = players.find(p => {
        return p.socket === id;
      });
      const castle = player.castle;
      if (key === "unit") {
        if (!castle.stop) {
          minions.push(new Minion({ player, ...castle.minion }));
        }
      }
      if (key === "attack") {
        if (castle.money >= 10000) {
          castle.minion.attack += 10;
          castle.money -= 10000;
        }
      }
      if (key === "hp") {
        if (castle.money >= 10000) {
          castle.minion.hp += 20;
          castle.money -= 10000;
        }
      }
      if (key === "speed") {
        if (castle.money >= 10000) {
          castle.minion.speed += 1;
          castle.money -= 10000;
        }
      }
      if (key === "hero") {
        if (castle.money >= 10000) {
          minions.push(new Minion({ player, hp: 3000, attack: 300, speed: 1 }));
          const alert = new PIXI.Text("영웅 생산!!", {
            fontFamily: "DungGeunMo",
            fontSize: 72,
            fill: player.camp === "red" ? 0xff1010 : 0x1010ff,
            align: "center"
          });
          alert.anchor.x = 0.5;
          alert.anchor.y = 0.5;
          alert.x = window.innerWidth / 2;
          alert.y = window.innerHeight / 2;
          app.stage.addChild(alert);
          setTimeout(() => {
            app.stage.removeChild(alert);
          }, 2000);
          castle.money -= 10000;
        }
      }
      if (key === "missile") {
        if (castle.money >= 10000) {
          minions.some((m, i) => {
            m.remove();
            if (i > 50) return true;
          });

          const alert = new PIXI.Text("50명 삭제!!", {
            fontFamily: "DungGeunMo",
            fontSize: 72,
            fill: player.camp === "red" ? 0xff1010 : 0x1010ff,
            align: "center"
          });
          alert.anchor.x = 0.5;
          alert.anchor.y = 0.5;
          alert.x = window.innerWidth / 2;
          alert.y = window.innerHeight / 2;
          app.stage.addChild(alert);
          setTimeout(() => {
            app.stage.removeChild(alert);
          }, 2000);

          castle.money -= 10000;
        }
      }
      if (key === "stop") {
        if (castle.money >= 10000) {
          const enemyCastle = castles.filter(c => c !== castle)[0];
          enemyCastle.stop = true;

          const alert = new PIXI.Text("2초간 생산 금지!!", {
            fontFamily: "DungGeunMo",
            fontSize: 72,
            fill: player.camp === "red" ? 0xff1010 : 0x1010ff,
            align: "center"
          });
          alert.anchor.x = 0.5;
          alert.anchor.y = 0.5;
          alert.x = window.innerWidth / 2;
          alert.y = window.innerHeight / 2;
          app.stage.addChild(alert);

          setTimeout(() => {
            app.stage.removeChild(alert);
            enemyCastle.stop = false;
          }, 2000);

          castle.money -= 10000;
        }
      }
    });

    setInterval(() => {
      castles.forEach(castle => {
        castle.money += 100;
        if (castle.money > 15000) castle.money = 15000;
        players.forEach(sendPlayerInformation);
      });
    }, 100);
  });
