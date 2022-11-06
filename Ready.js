window.onload = function () {
    let cheatCanvas = window.document.getElementById("cheatView");
    let cheatCtx = cheatCanvas.getContext('2d');
    let viewCanvas = window.document.getElementById("view");
    let viewCtx = viewCanvas.getContext('2d');
    let scoreBox = window.document.getElementById("score");
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
                }
            } else {
                // Identifying an inferior as a superior loses few points.
                // Identifying an superior as an inferior loses many points.
                player.score -= Math.min(npc.sides, 20) + (npc.isIsosceles ? 2 : 0) + (npc.sides >= 6 ? 2 : 0) + (Math.floor(Math.random() * 5 - 2));
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
