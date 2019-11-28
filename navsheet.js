(function () {
    class Vec2 {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        diff(other) {
            return this.add(other.mult(-1));
        }

        add(other) {
            return vec2(this.x + other.x, this.y + other.y);
        }

        mult(other) {
            if (other instanceof Vec2) {
                return vec2(this.x * other.x, this.y * other.y);
            } else {
                return vec2(this.x * other, this.y * other);
            }
        }

        dot(other) {
            return this.x * other.x + this.y * other.y;
        }

        norm() {
            return Math.sqrt(this.x ** 2 + this.y ** 2);
        }

        normalized() {
            return this.mult(1 / this.norm());
        }

        angle(other) {
            return Math.acos(this.normalized().dot(other.normalized()))// % Math.PI;
        }
    }



    // 1. pega todos os inputs
    const inputs = Array.from(document.querySelectorAll('input'));

    // 2. calcula o vetor deslocamento da posição de cada input para todos os outros
    const displacement = inputs.map(el => getDisplacementFrom(el, inputs.filter(filteredEl => el !== filteredEl)));

    // 3. determina quais são os vizinhos de cada input nas 4 direções
    const neighbors = inputs.map((el, i) => getNeighbors(el, displacement[i]));

    // 4. coloca um evento de teclado para cada input que faz com que as setas sejam navegáveis 
    inputs.forEach(el => attachKeyboardCallback(el, neighbors[inputs.indexOf(el)]));

    // 5. mostra aviso dizendo que executou
    showMessage('Navsheet foi aplicado!');
    
    // funções auxiliares
    function showMessage(message, dismissTime = '4s') {
        const sheet = (function () {
            const style = document.createElement('style');
            style.appendChild(document.createTextNode(''));
            document.head.appendChild(style);

            return style.sheet;
        })();

        reverse([
            `.navsheet-message {
                --width: 20em;
                font-size: 16px;
                padding: 0.5em;
                overflow: hidden;
                position: fixed;
                left: calc(50vw - var(--width) / 2);
                top: 5vh;
                width: var(--width);
                background-color: white;
                border: 1px solid silver;
                box-shadow: 2px 2px 2px #0006;
                border-radius: 1em;
                transform: scale(0.3);
                opacity: 0;
                transition: all 200ms cubic-bezier(0.3, 1.3, 0.9, 0.8);
            }`,
            `.navsheet-message.navsheet-shown {
                opacity: .85;
                transform: scale(1);
            }`,
            `.navsheet-message .navsheet-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background-color: rebeccapurple;
                transform: scaleX(1);
                transform-origin: 0 0;
                transition: transform ${dismissTime} linear;
            }`,
            `.navsheet-message.navsheet-shown .navsheet-progress {
                transform: scaleX(0);
            }`
        ]).forEach(rule => sheet.insertRule(rule));

        const messageEl = document.createElement('aside');
        messageEl.classList.add('navsheet-message');
        messageEl.innerHTML = `
            ${message}
            <div class="navsheet-progress"></div>
        `;
        document.body.appendChild(messageEl);
        const progressEl = messageEl.querySelector('.navsheet-progress');
        setTimeout(() => messageEl.classList.add('navsheet-shown'), 0);
        let alreadyRemoved = false;
        progressEl.addEventListener('transitionend', e => {
            if (e.target !== progressEl) return;
            messageEl.classList.remove('navsheet-shown');   
            messageEl.addEventListener('transitionend', () => 
                setTimeout(() =>
                    Array.from(document.body.children).indexOf(messageEl) !== -1 && document.body.removeChild(messageEl)), 500, { once: true });
        }, { once: true });
    }

    function getDisplacementFrom(el) {
        const index = inputs.indexOf(el);
        const elPosition = getPosition(el);

        const displacements = reduce(inputs, (accumulation, otherEl, i) => {
            const otherPosition = getPosition(otherEl);
            const displacementToI = otherPosition.diff(elPosition);
            accumulation[i] = displacementToI;

            return accumulation;
        }, new Array(inputs.length));

        return displacements;


        function getPosition(el) {
            const rect = el.getBoundingClientRect();
            return vec2((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
        }
    }

    function getNeighbors(el, displacements) {
        const directions = { up: vec2(0, -1), down: vec2(0, 1), left: vec2(-1, 0), right: vec2(1, 0) };

        // determina o ângulo entre o vetor da direction com os displacements
        const getAngles = direction => displacements.map(d => ({ displacement: d, distance: d.norm(), angle: directions[direction].angle(d) }));
        const angles = reduce(Object.keys(directions), (prev, dir) => {
            prev[dir] = getAngles(dir);
            return prev;
        }, {});

        // acha qual é o vizinho mais próximo para cada direção
        const findMin = displacements => {
            let index, indexOfMinSoFar, minDistanceSoFar = Infinity, minAngleSoFar = Infinity;
            for (index = 0; index < displacements.length; index++) {
                if (el === inputs[index]) continue;
                const currentComparison = displacements[index];
                if (currentComparison.angle < degToRad(45) && currentComparison.distance <= minDistanceSoFar && currentComparison.angle <= minAngleSoFar && !inputs[index].disabled) {
                    minDistanceSoFar = currentComparison.distance;
                    minAngleSoFar = currentComparison.angle;
                    indexOfMinSoFar = index;
                }
            }

            // indexOfMinSoFar contém o índice do input (em inputs) mais próximo deste el na direção dir (ou pode ser ele mesmo, aí desconsidera)
            if (el === inputs[indexOfMinSoFar]) return null;
            return inputs[indexOfMinSoFar];
        };
        return reduce(Object.keys(directions), (prev, dir) => {
            prev[dir] = findMin(angles[dir]);
            return prev;
        }, {});
    }

    function attachKeyboardCallback(el, neighbors) {
        const keyToDir = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        }
        el.addEventListener('keydown', moveToClosestNeighbor);

        function moveToClosestNeighbor(e) {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    {
                        const dir = keyToDir[e.key];
                        const targetEl = neighbors[dir];
                        if (targetEl) {
                            targetEl.focus();
                            e.preventDefault();
                        }
                    }
                    break;
            }
        }
    }

    function vec2(x, y) {
        return new Vec2(x, y);
    }

    function degToRad(deg) {
        return deg / 180 * Math.PI;
    }


    // como o SIGAA destruiu os métodos nativos do array, precisamos
    // implementar as funções aqui
    function reduce(array, fn, initial) {
        let result = initial;
        for (let i = 0; i < array.length; i++) {
            fn(result, array[i], i, array);
        }
        return result;
    }

    function reverse(array) {
        const size = array.length;
        for (let i = 0; i < Math.floor(size / 2); i++) {
            [array[i], array[size - 1 - i]] = [array[size - 1 - i], array[i]];
        }
        return array;
    }
})();