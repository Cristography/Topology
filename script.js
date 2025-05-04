document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas.getContext('2d');
    const nodeCountInput = document.getElementById('nodeCount');
    const descriptionDiv = document.getElementById('description');
    const resetButton = document.getElementById('resetButton');
    const quizButton = document.getElementById('quizButton');
    const quizContainer = document.getElementById('quizContainer');
    const quizForm = document.getElementById('quizForm');
    const submitQuizButton = document.getElementById('submitQuizButton');
    const quizResultsDiv = document.getElementById('quizResults');
    const closeQuizButton = document.getElementById('closeQuizButton');

    const topologyButtons = {
        bus: document.getElementById('busButton'),
        star: document.getElementById('starButton'),
        ring: document.getElementById('ringButton'),
        mesh: document.getElementById('meshButton'),
        tree: document.getElementById('treeButton'),
        hybrid: document.getElementById('hybridButton'),
    };

    // --- State Variables ---
    let nodes = [];
    let connections = [];
    let failedNodes = new Set();
    let selectedTopology = null;
    let nodeCount = parseInt(nodeCountInput.value, 10);

    // --- Constants ---
    const NODE_RADIUS = 15;
    const NODE_COLOR_OK = '#2ecc71';
    const NODE_COLOR_FAILED = '#e74c3c';
    const NODE_COLOR_CENTRAL = '#f1c40f'; // Star centers, Tree root
    const CONNECTION_COLOR_OK = '#3498db';
    const CONNECTION_COLOR_FAILED = '#c0392b';
    const CONNECTION_WIDTH_OK = 2;
    const CONNECTION_WIDTH_FAILED = 2;

    // --- Correct Quiz Answers ---
    const correctAnswers = { q1: 'b', q2: 'c', q3: 'b', q4: 'b', q5: 'c', q6: 'b', q7: 'a', q8: 'c' };
    const totalQuestions = Object.keys(correctAnswers).length;

    // --- Drawing Functions ---
    function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

    function drawNode(node) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        if (node.isFailed) ctx.fillStyle = NODE_COLOR_FAILED;
        else if (node.isCentral) ctx.fillStyle = NODE_COLOR_CENTRAL;
        else ctx.fillStyle = NODE_COLOR_OK;
        ctx.fill();
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1; ctx.stroke(); ctx.closePath();
        ctx.fillStyle = '#000'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);
        if (node.isFailed) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
            ctx.moveTo(node.x - node.radius * 0.5, node.y - node.radius * 0.5); ctx.lineTo(node.x + node.radius * 0.5, node.y + node.radius * 0.5);
            ctx.moveTo(node.x + node.radius * 0.5, node.y - node.radius * 0.5); ctx.lineTo(node.x - node.radius * 0.5, node.y + node.radius * 0.5);
            ctx.stroke(); ctx.closePath();
        }
    }

    function drawConnection(connection) {
        const { node1, node2 } = connection;
        const isDown = node1.isFailed || node2.isFailed || connection.isBroken;
        ctx.beginPath(); ctx.moveTo(node1.x, node1.y); ctx.lineTo(node2.x, node2.y);
        ctx.lineWidth = isDown ? CONNECTION_WIDTH_FAILED : CONNECTION_WIDTH_OK;
        ctx.strokeStyle = isDown ? CONNECTION_COLOR_FAILED : CONNECTION_COLOR_OK;
        ctx.stroke(); ctx.closePath();
    }

    function drawNetwork() {
        clearCanvas();
        connections.forEach(drawConnection);
        nodes.forEach(drawNode);
    }

    // --- Topology Generation ---
    function generateNodes(count) {
        nodes = [];
        for (let i = 0; i < count; i++) {
            nodes.push({ id: i, x: 0, y: 0, radius: NODE_RADIUS, isFailed: failedNodes.has(i), isCentral: false });
        }
        nodes.forEach(node => node.isFailed = failedNodes.has(node.id)); // Ensure consistency
    }

    function addConnection(node1, node2) {
        const existing = connections.find(conn => (conn.node1 === node1 && conn.node2 === node2) || (conn.node1 === node2 && conn.node2 === node1));
        if (existing || !node1 || !node2) return; // Avoid duplicates and ensure nodes exist
        connections.push({ node1, node2, isBroken: node1.isFailed || node2.isFailed });
    }

    function generateBus() {
        selectedTopology = 'Bus'; generateNodes(nodeCount); connections = [];
        const spacing = canvas.width / (nodeCount + 1); const yPos = canvas.height / 2;
        nodes.forEach((node, i) => { node.x = spacing * (i + 1); node.y = yPos; });
        for (let i = 0; i < nodeCount - 1; i++) addConnection(nodes[i], nodes[i + 1]);
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateStar() {
        selectedTopology = 'Star'; generateNodes(nodeCount); connections = [];
        const centerX = canvas.width / 2; const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 3;
        if (nodeCount > 0) {
            const centralNode = nodes[0]; centralNode.x = centerX; centralNode.y = centerY; centralNode.isCentral = true;
            for (let i = 1; i < nodeCount; i++) {
                const angle = (Math.PI * 2 * (i - 1)) / (nodeCount - 1);
                nodes[i].x = centerX + radius * Math.cos(angle); nodes[i].y = centerY + radius * Math.sin(angle);
                addConnection(centralNode, nodes[i]);
            }
        }
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateRing() {
        selectedTopology = 'Ring'; generateNodes(nodeCount); connections = [];
        const centerX = canvas.width / 2; const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 3;
        for (let i = 0; i < nodeCount; i++) {
            const angle = (Math.PI * 2 * i) / nodeCount;
            nodes[i].x = centerX + radius * Math.cos(angle); nodes[i].y = centerY + radius * Math.sin(angle);
        }
        for (let i = 0; i < nodeCount; i++) addConnection(nodes[i], nodes[(i + 1) % nodeCount]);
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateMesh() {
        selectedTopology = 'Mesh (Full)'; generateNodes(nodeCount); connections = [];
        const centerX = canvas.width / 2; const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 3;
        for (let i = 0; i < nodeCount; i++) {
            const angle = (Math.PI * 2 * i) / nodeCount;
            nodes[i].x = centerX + radius * Math.cos(angle); nodes[i].y = centerY + radius * Math.sin(angle);
        }
        for (let i = 0; i < nodeCount; i++) for (let j = i + 1; j < nodeCount; j++) addConnection(nodes[i], nodes[j]);
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    // --- Revised generateTree using BFS ---
    function generateTree() {
        selectedTopology = 'Tree';
        generateNodes(nodeCount);
        connections = [];
        if (nodeCount === 0) { drawNetwork(); return; }; // Handle empty case

        // Estimate levels needed and vertical spacing
        const levels = Math.max(1, Math.ceil(Math.log2(nodeCount + 1))); // +1 for better level calc
        const levelHeight = canvas.height / (levels + 1); // +1 to add space below last level
        let nodeIndex = 0;
        const queue = []; // Queue for BFS: { node, level }

        // Setup Root Node
        if (nodeIndex < nodeCount) {
            const root = nodes[nodeIndex++];
            root.x = canvas.width / 2;
            root.y = levelHeight; // Place first level
            root.isCentral = true; // Mark root as central
            queue.push({ node: root, level: 0 });
        }

        // BFS to place nodes level by level
        while (queue.length > 0 && nodeIndex < nodeCount) {
            const { node: parentNode, level } = queue.shift();

            // Calculate how many children this parent can have (aim for binary)
            // Limited by remaining nodes and max 2 children per parent
            const childrenToAssign = Math.min(2, nodeCount - nodeIndex);

            if (childrenToAssign === 0) continue; // No more nodes left to assign

            // Calculate positioning for children relative to parent
            const childrenY = levelHeight * (level + 2); // Y position for the next level
            // Spread children horizontally based on the level depth
            // Wider spread for levels closer to the root
            const horizontalSpreadFactor = Math.pow(0.6, level); // Decrease spread lower down
            const horizontalSpread = (canvas.width / 4) * horizontalSpreadFactor;

            for (let i = 0; i < childrenToAssign; i++) {
                if (nodeIndex >= nodeCount) break; // Double check we haven't run out of nodes

                const childNode = nodes[nodeIndex++];
                // Position left (i=0) or right (i=1) child
                // If only one child, center it horizontally relative to parent slightly
                let childXOffset = 0;
                 if (childrenToAssign === 1) {
                    childXOffset = (Math.random() - 0.5) * 20; // Small random offset if single child
                 } else {
                     childXOffset = (i === 0 ? -horizontalSpread : horizontalSpread);
                 }

                childNode.x = parentNode.x + childXOffset;
                // Clamp X within canvas bounds to prevent nodes going off-screen
                childNode.x = Math.max(NODE_RADIUS + 5, Math.min(canvas.width - NODE_RADIUS - 5, childNode.x));
                childNode.y = childrenY;

                addConnection(parentNode, childNode);
                queue.push({ node: childNode, level: level + 1 }); // Add child to queue for processing its children
            }
        }

        // Simple collision avoidance pass (optional refinement)
        // Iterate level by level and push nodes apart horizontally if too close
        const allLevels = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b); // Get unique Y levels
        allLevels.forEach(yLevel => {
            let levelNodes = nodes.filter(n => n.y === yLevel);
            levelNodes.sort((a, b) => a.x - b.x); // Sort nodes on this level by X position
            for (let i = 0; i < levelNodes.length - 1; i++) {
                let nodeA = levelNodes[i];
                let nodeB = levelNodes[i + 1];
                const dx = nodeB.x - nodeA.x;
                const minDistance = NODE_RADIUS * 2.5; // Minimum desired horizontal distance

                if (dx < minDistance) {
                    // Nodes are too close, push them apart
                    const overlap = minDistance - dx;
                    const adjust = overlap / 2 + 1; // Amount to move each node (+1 buffer)
                    nodeA.x = Math.max(NODE_RADIUS + 1, nodeA.x - adjust); // Ensure stays within bounds
                    nodeB.x = Math.min(canvas.width - NODE_RADIUS - 1, nodeB.x + adjust);
                }
            }
             // After adjusting nodeA and nodeB, we might need to re-check nodeB against nodeC (i+2)
             // For simplicity, one pass might be sufficient visually. Can re-run if needed.
        });

        updateConnectionStatus();
        updateDescriptionContent();
        drawNetwork();
    }


    // --- Revised generateHybrid ---
    function generateHybrid() {
        selectedTopology = 'Hybrid (Star-Bus-Star)';
        if (nodeCount < 5) {
            alert("Hybrid (Star-Bus-Star) example requires at least 5 nodes.");
            resetVisualization(); return;
        }
        generateNodes(nodeCount); connections = [];
        let nodeIdx = 0;

        // --- Define Structure Parameters ---
        const numStars = 2;
        // Calculate nodes per star, ensuring at least 1 central + 1 peripheral
        let nodesPerStar = Math.max(2, Math.floor((nodeCount - 1) / numStars));
        // Calculate remaining nodes for the dedicated bus line
        let numDedicatedBusNodes = nodeCount - (nodesPerStar * numStars);

        // Adjust if initial calculation is off (e.g., nodeCount=5)
        if (numDedicatedBusNodes < 0) {
            nodesPerStar = Math.max(2, Math.floor(nodeCount / numStars)); // Re-evaluate nodes per star
            numDedicatedBusNodes = Math.max(0, nodeCount - (nodesPerStar * numStars)); // Recalculate bus nodes
        }
        // Final check to ensure star has at least 2 nodes if possible
        if (nodeCount - numDedicatedBusNodes < numStars * 2) {
            // Not enough nodes for 2 stars + bus, reduce bus nodes if possible
            numDedicatedBusNodes = Math.max(0, nodeCount - (numStars * 2));
            nodesPerStar = 2;
        }


        const starCenters = [];
        const starAreaWidth = canvas.width / (numStars + 1); // Space for stars + bus

        // --- Create Stars ---
        for (let s = 0; s < numStars; s++) {
            const starCenterX = starAreaWidth * (s + 1); // Center X for this star's area
            const starCenterY = canvas.height * 0.3; // Place stars higher
            const starRadius = Math.min(starAreaWidth * 0.3, canvas.height * 0.2);

            // Assign Central Node
            if (nodeIdx >= nodeCount) break;
            const centralNode = nodes[nodeIdx++];
            centralNode.x = starCenterX; centralNode.y = starCenterY; centralNode.isCentral = true;
            starCenters.push(centralNode);

            // Assign Peripheral Nodes
            const numPeripherals = Math.min(nodesPerStar - 1, nodeCount - nodeIdx);
            for (let i = 0; i < numPeripherals; i++) {
                if (nodeIdx >= nodeCount) break;
                const peripheralNode = nodes[nodeIdx++];
                const angle = (Math.PI * 2 * i) / numPeripherals;
                peripheralNode.x = starCenterX + starRadius * Math.cos(angle);
                peripheralNode.y = starCenterY + starRadius * Math.sin(angle);
                addConnection(centralNode, peripheralNode);
            }
        }

        // --- Create Bus ---
        const busY = canvas.height * 0.7; // Place bus line lower
        const dedicatedBusNodes = []; // Nodes physically on the bus line
        const allBusParticipants = [...starCenters]; // Start participants list with star centers

        // Assign Dedicated Bus Nodes (if any)
        const actualDedicatedBusNodes = Math.min(numDedicatedBusNodes, nodeCount - nodeIdx);
        for (let i = 0; i < actualDedicatedBusNodes; i++) {
             if (nodeIdx >= nodeCount) break;
             const busNode = nodes[nodeIdx++];
             dedicatedBusNodes.push(busNode);
             allBusParticipants.push(busNode);
        }

        // Position only the dedicated bus nodes evenly on the bus line
        const busLineStartX = canvas.width * 0.15;
        const busLineEndX = canvas.width * 0.85;
        const busLineWidth = busLineEndX - busLineStartX;
        const busSpacing = dedicatedBusNodes.length > 0 ? busLineWidth / (dedicatedBusNodes.length + 1) : 0;

        dedicatedBusNodes.forEach((node, i) => {
             node.x = busLineStartX + busSpacing * (i + 1);
             node.y = busY;
        });

        // Connect Bus Participants: Sort all participants (centers + dedicated) by X position
        allBusParticipants.sort((a, b) => a.x - b.x);

        // Connect sequentially based on sorted X position
        for(let i = 0; i < allBusParticipants.length - 1; i++) {
            if (allBusParticipants[i] && allBusParticipants[i+1]) {
               addConnection(allBusParticipants[i], allBusParticipants[i+1]);
            }
        }

        updateConnectionStatus();
        updateDescriptionContent();
        drawNetwork();
    }


    // --- Failure Simulation & Connection Updates ---
    function updateConnectionStatus() {
        connections.forEach(conn => conn.isBroken = conn.node1.isFailed || conn.node2.isFailed);
    }

    function getNodeAtPosition(x, y) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i]; const dx = x - node.x; const dy = y - node.y;
            if (dx * dx + dy * dy < node.radius * node.radius) return node;
        } return null;
    }

    function handleCanvasClick(event) {
        if (!selectedTopology || nodes.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX; const y = (event.clientY - rect.top) * scaleY;
        const clickedNode = getNodeAtPosition(x, y);
        if (clickedNode) {
            clickedNode.isFailed = !clickedNode.isFailed;
            if (clickedNode.isFailed) failedNodes.add(clickedNode.id);
            else failedNodes.delete(clickedNode.id);
            updateConnectionStatus(); updateDescriptionContent(clickedNode); drawNetwork();
        }
    }

    // --- Description Update ---
    function updateDescriptionContent(affectedNode = null) {
        let html = `<h3>${selectedTopology || 'No Topology Selected'}</h3>`; let failureInfo = '';
        switch (selectedTopology) {
            case 'Bus': html += `<p>🚌 Nodes connect sequentially to a single shared backbone cable... <strong>Disadvantage:</strong> Backbone failure affects multiple nodes...</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failed...`; break;
            case 'Star': html += `<p>⭐ All nodes connect to a central hub/switch... <strong>Disadvantage:</strong> Central hub is a single point of failure.</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failure simulated. ${affectedNode.isCentral ? '<strong>Critical Failure:</strong> Central hub down...' : 'Peripheral Node isolated...'}`; break;
            case 'Ring': html += `<p>🔄 Nodes connect in a closed loop... <strong>Disadvantage:</strong> A single failure can break the ring...</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failed. Connections broken, disrupting ring path...`; break;
            case 'Mesh (Full)': html += `<p>🕸️ Every node connects directly to every other node... Highly redundant... <strong>Disadvantage:</strong> Very expensive and complex...</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failed. Only this node offline...`; break;
            case 'Tree': html += `<p>🌳 Hierarchical structure combining star/bus... Scalable... <strong>Disadvantage:</strong> Failure of a higher-level node can isolate branches...</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failed. This node and sub-trees below it are isolated...`; break;
            case 'Hybrid (Star-Bus-Star)': html += `<p>🔗 Combines multiple topologies... Flexibility... <strong>Disadvantage:</strong> Can be complex...</p>`; if (affectedNode) failureInfo = `Node ${affectedNode.id} failed. Impact depends on role: peripheral, hub, or bus node...`; break;
            default: html = `<p>Select a topology type and number of nodes... Click the corresponding button... Click on a node to simulate failure...</p>`; break;
        }
        if (failureInfo) html += `<p style="margin-top: 10px;"><em><strong>Failure Simulation:</strong> ${failureInfo}</em></p>`;
        else if (selectedTopology) html += `<p style="margin-top: 10px;"><em>Click on a node to simulate its failure.</em></p>`;
        descriptionDiv.innerHTML = html;
    }

    // --- Reset Function ---
    function resetVisualization() {
        nodes = []; connections = []; failedNodes.clear(); selectedTopology = null; clearCanvas();
        nodeCountInput.value = 5; nodeCount = 5; updateDescriptionContent();
        ctx.fillStyle = '#7f8c8d'; ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText("Select a topology or take the quiz", canvas.width / 2, canvas.height / 2);
    }

    // --- Quiz Functionality ---
    function showQuiz() { resetQuizState(); quizContainer.classList.remove('hidden'); quizButton.textContent = 'Hide Quiz 📝'; quizButton.setAttribute('aria-expanded', 'true'); quizContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    function hideQuiz() { quizContainer.classList.add('hidden'); quizButton.textContent = 'Take Quiz 📝'; quizButton.setAttribute('aria-expanded', 'false'); }
    function toggleQuiz() { if (quizContainer.classList.contains('hidden')) showQuiz(); else hideQuiz(); }
    function resetQuizState() {
        quizForm.reset(); quizResultsDiv.innerHTML = ''; quizResultsDiv.className = 'quiz-results'; submitQuizButton.disabled = false;
        quizForm.querySelectorAll('.quiz-question label').forEach(label => {
            label.classList.remove('correct-answer', 'incorrect-choice', 'reveal-correct');
            const input = label.querySelector('input[type="radio"]'); if (input) input.disabled = false;
        });
    }
    function submitQuiz() {
        let score = 0;
        quizForm.querySelectorAll('.quiz-question').forEach((qDiv, i) => {
            const qName = `q${i + 1}`; const correctAns = correctAnswers[qName];
            const optsDiv = qDiv.querySelector('.quiz-options');
            const selectedInput = quizForm.querySelector(`input[name="${qName}"]:checked`);
            optsDiv.querySelectorAll(`input[name="${qName}"]`).forEach(opt => opt.disabled = true);
            const correctInput = optsDiv.querySelector(`input[value="${correctAns}"]`);
            const correctLabel = correctInput ? correctInput.closest('label') : null;
            if (selectedInput) {
                const selectedLabel = selectedInput.closest('label');
                if (selectedInput.value === correctAns) { score++; if (selectedLabel) selectedLabel.classList.add('correct-answer'); }
                else { if (selectedLabel) selectedLabel.classList.add('incorrect-choice'); if (correctLabel) correctLabel.classList.add('reveal-correct'); }
            } else { if (correctLabel) correctLabel.classList.add('reveal-correct'); }
        });
        quizResultsDiv.innerHTML = `Your Score: ${score} out of ${totalQuestions}`;
        if (score === totalQuestions) { quizResultsDiv.className = 'quiz-results correct'; quizResultsDiv.innerHTML += ' - Excellent! 🎉'; }
        else if (score >= Math.ceil(totalQuestions * 0.6)) { quizResultsDiv.className = 'quiz-results correct'; quizResultsDiv.innerHTML += ' - Good job!'; }
        else { quizResultsDiv.className = 'quiz-results incorrect'; quizResultsDiv.innerHTML += ' - Keep reviewing!'; }
        submitQuizButton.disabled = true; quizResultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- Event Listeners ---
    nodeCountInput.addEventListener('change', () => {
        let count = parseInt(nodeCountInput.value, 10); count = Math.max(3, Math.min(15, count));
        nodeCountInput.value = count; nodeCount = count;
        if (selectedTopology) {
            const generatorMap = { 'Bus': generateBus, 'Star': generateStar, 'Ring': generateRing, 'Mesh (Full)': generateMesh, 'Tree': generateTree, 'Hybrid (Star-Bus-Star)': generateHybrid };
            const regenerateFn = generatorMap[selectedTopology]; if (regenerateFn) regenerateFn();
        }
    });

    const generatorMap = { bus: generateBus, star: generateStar, ring: generateRing, mesh: generateMesh, tree: generateTree, hybrid: generateHybrid };
    Object.keys(topologyButtons).forEach(key => {
        const button = topologyButtons[key]; const generatorFn = generatorMap[key];
        if (button && typeof generatorFn === 'function') button.addEventListener('click', generatorFn);
        else console.error(`Failed to attach listener for key: '${key}'.`);
    });

    canvas.addEventListener('click', handleCanvasClick);
    resetButton.addEventListener('click', resetVisualization);
    quizButton.addEventListener('click', toggleQuiz);
    submitQuizButton.addEventListener('click', submitQuiz);
    closeQuizButton.addEventListener('click', hideQuiz);

    // --- Initial Setup ---
    resetVisualization(); // Initialize on load
});