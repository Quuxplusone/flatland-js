window.onload = function () {
    let cheatCanvas = window.document.getElementById("cheatView");
    let cheatCtx = cheatCanvas.getContext('2d');
    let viewCanvas = window.document.getElementById("view");
    let viewCtx = viewCanvas.getContext('2d');
    let scoreBox = window.document.getElementById("score");
    let greetingBox = window.document.getElementById("greetings");
    let pauseNPCs = false;
    let shouldDrawCrosshairs = false;
    let npcs = [];
    const max_speed = Flatland.metersPerSec(10);
    const max_speeda = Math.PI / 30;
    const deceleration = Flatland.metersPerS2(0.4);
    const acceleration = Flatland.metersPerS2(1.0);
    const angular_acceleration = Math.PI / 100;
    const angular_deceleration = Math.PI / 200;
    const nrays = 500;
    const viewArc = Math.PI / 2;

    let view = new Flatland.View(viewCanvas);
    let cheatView = new Flatland.CheatView(cheatCanvas);

    let player = {
        sides: 4,
        center: { x: 0, y: 0 },
        angle: 0,  // also counts as `dir`: the player doesn't wiggle
        radius: Flatland.meters(12),
        speedx: Flatland.metersPerSec(0),
        speedy: Flatland.metersPerSec(0),
        speeda: 0,
        score: 0,
    };

    window.document.onkeydown = function (e) {
        if (e.keyCode === 37 || e.key == 'a') { // turn left
            player.speeda -= angular_acceleration;
        } else if (e.keyCode === 39 || e.key == 'd') { // turn right
            player.speeda += angular_acceleration;
        } else if (e.keyCode === 38 || e.key == 'w') { // forward
            player.speedx += acceleration * Math.cos(player.angle);
            player.speedy += acceleration * Math.sin(player.angle);
        } else if (e.keyCode === 40 || e.key == 's') { // back
            player.speedx -= acceleration * Math.cos(player.angle);
            player.speedy -= acceleration * Math.sin(player.angle);
        } else if (e.key == 'z') { // strafe left
            player.speedx += acceleration * Math.cos(player.angle - Math.PI/2);
            player.speedy += acceleration * Math.sin(player.angle - Math.PI/2);
        } else if (e.key == 'x') { // strafe right
            player.speedx += acceleration * Math.cos(player.angle + Math.PI/2);
            player.speedy += acceleration * Math.sin(player.angle + Math.PI/2);
        } else if (e.keyCode == 32) { // pause
            pauseNPCs = !pauseNPCs;
        } else if ('1' <= e.key && e.key <= '9') {
            attemptShapeIdentification(e.key.charCodeAt(0) - 48);
        } else if (e.key == '+') {
            shouldDrawCrosshairs = !shouldDrawCrosshairs;
        } else if (e.key == '~') {
            cheatCanvas.hidden = !cheatCanvas.hidden;
        }
    };

    let printGreeting = function (one, two) {
        greetingBox.innerHTML = one + "<br>" + two;
    };

    let appropriateGreeting = function (x) {
        let greetings = (x === 1) ? [
            "Pardon me, ma'am.",
            "Pardon me, ma'am!"
        ] : (x === 2) ? [
            "Out of the way, you Irregular!",
            "Make way, Irregular!",
            "One side, Irregular!"
        ] : (x === 3) ? [
            "Good morning, Mr. Triangle.",
            "Good morning, Mr. Triangle!",
            "How do you do, Mr. Triangle?",
        ] : (x === 4) ? [
            "Good morning, Mr. Square.",
            "Good morning, fellow Square!",
            "How do you do, fellow Square?",
            "Pleased to meet you, Mr. Square.",
            "Lovely day we're having, Mr. Square."
        ] : (x === 5) ? [
            "A fine morning to you, Mr. Pentagon!",
            "How do you do, Mr. Pentagon?",
            "Pleased to make your acquaintance, Mr. Pentagon."
        ] : (x === 6) ? [
            "A fine morning to you, Mr. Hexagon!",
            "I beg your pardon, Mr. Hexagon!",
            "Begging your pardon, Mr. Hexagon!",
            "Have a lovely day, Mr. Hexagon.",
        ] : (x === 7) ? [
            "I beg your pardon, Mr. Heptagon!",
            "Begging your pardon, Mr. Heptagon.",
            "Begging your pardon, Mr. Heptagon!",
            "How lovely to meet you, Mr. Heptagon."
        ] : (x === 8) ? [
            "Excuse me, Mr. Octagon.",
            "Begging your pardon, sir.",
            "Begging your pardon, Mr. Octagon!",
            "Pardon my intrusion, sir!"
        ] : (x === 9) ? [
            "I beg your pardon, your excellency!",
            "I beg your pardon, your illustriousness!",
            "I beg your pardon, your lordship!"
        ] : console.assert(false);
        return greetings[Math.floor(Math.random() * greetings.length)];
    };

    let pleasedResponse = function (npc) {
        let x = (npc.isIsosceles ? 2 : npc.sides >= 9 ? 9 : npc.sides);
        let greetings = (x === 1) ? [
            "With pleasure.",
            "Thank you kindly, sir.",
            "Thank you kindly, sir!",
            "Pardon me, please, sir."
        ] : (x === 2) ? [
            "*grunt*",
            "Apologies, Mr. Square.",
            "Sorry, sir.",
            "Sorry, sir!"
        ] : (x === 3) ? [
            "Good morning, Mr. Square.",
            "Good morning, Mr. Square!",
            "A fine morning it is, Mr. Square!",
            "Pleased to meet you, Mr. Square!"
        ] : (x === 4) ? [
            "Good morning!",
            "How do you do?",
            "A fine morning it is!",
            "Pleased to meet you."
        ] : (x === 5) ? [
            "Good morning!",
            "How do you do?",
            "A fine morning it is!",
            "Pleased to meet you."
        ] : (x === 6) ? [
            "Good morning, Mr. Square.",
            "Good morning, Mr. Square!",
            "A pleasure, Mr. Square.",
            "A pleasure, Mr. Square!",
            "A fine morning, Mr. Square!"
        ] : (x === 7) ? [
            "Good morning, Mr. Square.",
            "Don't mention it, Mr. Square.",
            "How kind of you, Mr. Square.",
        ] : (x === 8) ? [
            "Don't mention it, Mr. Square.",
            "How kind of you, Mr. Square.",
            "It's nothing, Mr. Square."
        ] : (x === 9) ? [
            "Don't mention it, Mr. Square.",
            "How kind of you, Mr. Square.",
            "It's nothing, Mr. Square."
        ] : console.assert(false);
        return greetings[Math.floor(Math.random() * greetings.length)];
    };

    let insultedResponse = function (guess, npc) {
        let x = (npc.isIsosceles ? 2 : npc.sides >= 9 ? 9 : npc.sides);
        let messages = {
            1: [
                "*offended grunt*",
                "Hm!",
                "Hmph! Joker!",
                "No need to be rude!"
            ],
            2: [
                "I've never been so insulted!",
                "Well, I never!",
                "Perhaps your eye deceives you, sir.",
                "Perhaps your eye deceives you, sir!",
                "I'll have you know I am utterly Regular, sir!"
            ],
            3: [
                "Well, I never!",
                "Perhaps you have me confused with my father!",
                "Perhaps you have me confused with my father, sir!",
                "Perhaps your eye deceives you, sir.",
                "Perhaps your eye deceives you, sir!"
            ],
            4: [
                "Well, I never!",
                "Are you joking?",
                "Are you joking, sir?",
                "Are you blind?",
                "What are you on about?",
                "What in Space are you on about?",
                "Hmph! Foolishness!"
            ],
            5: [
                "I've never been so insulted!",
                "Hmph! Foolishness!",
                "Are you insane, you Square?",
                "Are you blind, you Square?",
                "Out of the way, you Square!",
                "Stop your blathering this instant!"
            ],
            6: [
                "I've never been so insulted!",
                "Hmph! Good morning!",
                "*silent disdain*"
            ],
            7: [
                "Are you mocking me, Square?",
                "What a fool that Square is!",
                "*smirk*"
            ],
            8: [
                "Well, I never!",
                "How rude!",
                "A Square should have better manners!"
            ],
            9: [
                "You're mistaken, sir.",
                "Your eye deceives you, sir!",
                "'Morning, Square!",
                "*smirk*"
            ],
            10: [
                "You're mistaken, sir.",
                "How rude!",
                "Are you mocking me, Square?",
                "What a fool!",
                "'Morning, Hexagon!",
                "'Morning, Heptagon!",
                "'Morning, Octagon!",
                "*smirk*",
                "*annoyed grunt*"
            ],
            11: [
                "Well, I never!",
                "Perhaps you have me confused with my son!",
                "Perhaps you have me confused with my son, sir!",
                "Perhaps your eye deceives you, sir.",
                "Perhaps your eye deceives you, sir!"
            ],
        };
        let table = [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,1,1,4,4,4,5,5,5],
            [0,8,0,2,4,4,4,5,5,5],
            [0,1,9,0,3,4,6,5,5,5],
            [0,1,9,9,0,3,6,6,5,5],
            [0,1,10,7,11,0,3,6,6,5],
            [0,1,10,10,9,11,0,6,6,5],
            [0,1,10,10,6,4,7,0,6,6],
            [0,1,10,10,6,6,4,7,0,6],
            [0,1,10,10,6,6,6,7,7,0],
        ];
        let idx = table[guess][x];
        let greetings = messages[idx];
        return greetings[Math.floor(Math.random() * greetings.length)];
    };

    let attemptShapeIdentification = function (x) {
        let ray = Flatland.castRay({
            origin: player.center,
            angle: player.angle,
            shapes: npcs
        });

        if (ray.distance != Infinity) {
            let npc = ray.shape;
            let success = npc.isIsosceles ? (x == 2) :
                          npc.sides >= 9 ? (x == 9) :
                          (npc.sides == x);
            if (success) {
                // Identifying an inferior as an inferior gains few points.
                // Identifying an superior as a superior gains many points.
                if (!npc.identified) {
                    player.score += Math.min(npc.sides, 9) + (npc.sides >= 6 ? 2 : 0);
                    npc.identified = true;
                    printGreeting(appropriateGreeting(x), pleasedResponse(npc));
                }
            } else {
                // Identifying an inferior as a superior loses few points.
                // Identifying an superior as an inferior loses many points.
                player.score -= Math.min(npc.sides, 20) + (npc.isIsosceles ? 2 : 0) + (npc.sides >= 6 ? 2 : 0) + (Math.floor(Math.random() * 5 - 2));
                printGreeting(appropriateGreeting(x), insultedResponse(x, npc));
            }
        }
    };

    let movePlayer = function () {
        player.speedx = Math.min(Math.max(-max_speed, player.speedx), max_speed);
        player.speedy = Math.min(Math.max(-max_speed, player.speedy), max_speed);
        player.speeda = Math.min(Math.max(-max_speeda, player.speeda), max_speeda);

        player.center.x += player.speedx;
        player.center.y += player.speedy;
        player.angle = Flatland.nearZeroAngle(player.angle + player.speeda);

        player.speedx = (player.speedx >= 0) ? Math.max(0, player.speedx - deceleration) : Math.min(0, player.speedx + deceleration);
        player.speedy = (player.speedy >= 0) ? Math.max(0, player.speedy - deceleration) : Math.min(0, player.speedy + deceleration);
        player.speeda = (player.speeda >= 0) ? Math.max(0, player.speeda - angular_deceleration) : Math.min(0, player.speeda + angular_deceleration);

        // Re-center the player by force.
        if (player.center.x != 0 || player.center.y != 0) {
            for (let npc of npcs) {
                npc.center.x -= player.center.x;
                npc.center.y -= player.center.y;
            }
            player.center.x = 0;
            player.center.y = 0;
        }
    };

    let moveNPCs = function () {
        // TODO: Aspirational, not yet implemented...
        // Don't let any NPC get closer to the player than 3m.

        let canDespawn = function (npc) {
            return Flatland.getDistance(player.center, npc.center) > Flatland.meters(600) &&
                   Math.abs(Flatland.nearZeroAngle(Flatland.getAngleTo(player.center, npc.center) - player.angle)) > (Math.PI / 2);
        };

        // Remove 10% of despawnable NPCs, then maybe spawn a new one.
        npcs = npcs.filter(npc => !(canDespawn(npc) && Math.random() < 0.10));
        if (npcs.length < 10) {
            let a = 2 * Math.PI * Math.random();
            let d = Math.abs(Flatland.nearZeroAngle(a - player.angle)) > (viewArc / 2) ? Flatland.meters(500) : Flatland.meters(1000);
            let center = { x: d * Math.cos(a), y: d * Math.sin(a) };
            let dir = a + Math.PI + (Math.random() - 0.5) * Math.PI/2;
            npcs.push(new Flatland.RandomShape(center, dir));
        }

        for (let npc of npcs) {
            npc.moveNPC(npcs);
        }
    };

    let timeStep = function () {
        // clear the canvases before doing anything
        cheatCtx.clearRect(0, 0, cheatCanvas.width, cheatCanvas.height);
        viewCtx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);

        movePlayer();

        if (!pauseNPCs) {
            moveNPCs();
        }

        var rays = [];
        for (let i = 0; i <= nrays; ++i) {
            let ray = Flatland.castRay({
                origin: player.center,
                angle: player.angle + (i * viewArc / nrays) - (viewArc / 2),
                shapes: npcs
            });
            rays.push(ray);
            cheatView.drawLine(player.center, ray.endpoint);
        }
        view.drawRays(rays);
        if (shouldDrawCrosshairs) {
            view.drawCrosshairs();
        }

        cheatView.drawShape(player);
        for (let npc of npcs) {
            cheatView.drawShape(npc);
            cheatView.drawLine(npc.center, { x: npc.center.x + 20*Math.cos(npc.dir), y: npc.center.y + 20*Math.sin(npc.dir) });
        }

        scoreBox.innerHTML = player.score.toString() + " points";
    };

    for (let i = 0; i < 300; ++i) timeStep();
    window.setInterval(timeStep, 100);
};
