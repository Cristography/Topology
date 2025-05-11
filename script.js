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
    const NODE_COLOR_OK = '#2ecc71'; // أخضر
    const NODE_COLOR_FAILED = '#e74c3c'; // أحمر
    const NODE_COLOR_CENTRAL = '#f1c40f'; // أصفر (للمراكز والجذور)
    const CONNECTION_COLOR_OK = '#3498db'; // أزرق
    const CONNECTION_COLOR_FAILED = '#c0392b'; // أحمر داكن
    const CONNECTION_WIDTH_OK = 2;
    const CONNECTION_WIDTH_FAILED = 2;

    // --- Correct Quiz Answers (in LTR for keys) ---
    const correctAnswers = { q1: 'b', q2: 'c', q3: 'b', q4: 'b', q5: 'c', q6: 'b', q7: 'a', q8: 'c', q9: 'b' };
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
        nodes.forEach(node => node.isFailed = failedNodes.has(node.id));
    }

    function addConnection(node1, node2) {
        const existing = connections.find(conn => (conn.node1 === node1 && conn.node2 === node2) || (conn.node1 === node2 && conn.node2 === node1));
        if (existing || !node1 || !node2) return;
        connections.push({ node1, node2, isBroken: node1.isFailed || node2.isFailed });
    }

    function generateBus() {
        selectedTopology = 'التوبولوجيا الخطية (Bus)'; generateNodes(nodeCount); connections = [];
        const spacing = canvas.width / (nodeCount + 1); const yPos = canvas.height / 2;
        nodes.forEach((node, i) => { node.x = spacing * (i + 1); node.y = yPos; });
        for (let i = 0; i < nodeCount - 1; i++) addConnection(nodes[i], nodes[i + 1]);
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateStar() {
        selectedTopology = 'التوبولوجيا النجمية (Star)'; generateNodes(nodeCount); connections = [];
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
        selectedTopology = 'التوبولوجيا الدائرية (Ring)'; generateNodes(nodeCount); connections = [];
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
        selectedTopology = 'التوبولوجيا الشبكية (Mesh - Full)'; generateNodes(nodeCount); connections = [];
        const centerX = canvas.width / 2; const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 3;
        for (let i = 0; i < nodeCount; i++) {
            const angle = (Math.PI * 2 * i) / nodeCount;
            nodes[i].x = centerX + radius * Math.cos(angle); nodes[i].y = centerY + radius * Math.sin(angle);
        }
        for (let i = 0; i < nodeCount; i++) for (let j = i + 1; j < nodeCount; j++) addConnection(nodes[i], nodes[j]);
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateTree() {
        selectedTopology = 'التوبولوجيا الشجرية (Tree)';
        generateNodes(nodeCount);
        connections = [];
        if (nodeCount === 0) { drawNetwork(); return; };

        const levels = Math.max(1, Math.ceil(Math.log2(nodeCount + 1)));
        const levelHeight = canvas.height / (levels + 1);
        let nodeIndex = 0;
        const queue = [];

        if (nodeIndex < nodeCount) {
            const root = nodes[nodeIndex++];
            root.x = canvas.width / 2;
            root.y = levelHeight;
            root.isCentral = true;
            queue.push({ node: root, level: 0 });
        }

        while (queue.length > 0 && nodeIndex < nodeCount) {
            const { node: parentNode, level } = queue.shift();
            const childrenToAssign = Math.min(2, nodeCount - nodeIndex);
            if (childrenToAssign === 0) continue;

            const childrenY = levelHeight * (level + 2);
            const horizontalSpreadFactor = Math.pow(0.6, level);
            const horizontalSpread = (canvas.width / 4) * horizontalSpreadFactor;

            for (let i = 0; i < childrenToAssign; i++) {
                if (nodeIndex >= nodeCount) break;
                const childNode = nodes[nodeIndex++];
                let childXOffset = 0;
                 if (childrenToAssign === 1) {
                    childXOffset = (Math.random() - 0.5) * 20;
                 } else {
                     childXOffset = (i === 0 ? -horizontalSpread : horizontalSpread);
                 }
                childNode.x = parentNode.x + childXOffset;
                childNode.x = Math.max(NODE_RADIUS + 5, Math.min(canvas.width - NODE_RADIUS - 5, childNode.x));
                childNode.y = childrenY;
                addConnection(parentNode, childNode);
                queue.push({ node: childNode, level: level + 1 });
            }
        }
        const allLevels = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b);
        allLevels.forEach(yLevel => {
            let levelNodes = nodes.filter(n => n.y === yLevel);
            levelNodes.sort((a, b) => a.x - b.x);
            for (let i = 0; i < levelNodes.length - 1; i++) {
                let nodeA = levelNodes[i]; let nodeB = levelNodes[i + 1];
                const dx = nodeB.x - nodeA.x; const minDistance = NODE_RADIUS * 2.5;
                if (dx < minDistance) {
                    const overlap = minDistance - dx; const adjust = overlap / 2 + 1;
                    nodeA.x = Math.max(NODE_RADIUS + 1, nodeA.x - adjust);
                    nodeB.x = Math.min(canvas.width - NODE_RADIUS - 1, nodeB.x + adjust);
                }
            }
        });
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
    }

    function generateHybrid() {
        selectedTopology = 'التوبولوجيا المختلطة (Star-Bus-Star)';
        if (nodeCount < 5) { alert("التوبولوجيا المختلطة (Star-Bus-Star) تتطلب 5 عقد على الأقل."); resetVisualization(); return; }
        generateNodes(nodeCount); connections = []; let nodeIdx = 0;
        const numStars = 2;
        let nodesPerStar = Math.max(2, Math.floor((nodeCount - 1) / numStars));
        let numDedicatedBusNodes = nodeCount - (nodesPerStar * numStars);
        if (numDedicatedBusNodes < 0) {
            nodesPerStar = Math.max(2, Math.floor(nodeCount / numStars));
            numDedicatedBusNodes = Math.max(0, nodeCount - (nodesPerStar * numStars));
        }
        if (nodeCount - numDedicatedBusNodes < numStars * 2) {
            numDedicatedBusNodes = Math.max(0, nodeCount - (numStars * 2));
            nodesPerStar = 2;
        }
        const starCenters = []; const starAreaWidth = canvas.width / (numStars + 1);
        for (let s = 0; s < numStars; s++) {
            if (nodeIdx >= nodeCount) break;
            const starCenterX = starAreaWidth * (s + 1); const starCenterY = canvas.height * 0.3;
            const starRadius = Math.min(starAreaWidth * 0.3, canvas.height * 0.2);
            const centralNode = nodes[nodeIdx++]; centralNode.x = starCenterX; centralNode.y = starCenterY; centralNode.isCentral = true; starCenters.push(centralNode);
            const numPeripherals = Math.min(nodesPerStar - 1, nodeCount - nodeIdx);
            for (let i = 0; i < numPeripherals; i++) {
                if (nodeIdx >= nodeCount) break;
                const peripheralNode = nodes[nodeIdx++]; const angle = (Math.PI * 2 * i) / numPeripherals;
                peripheralNode.x = starCenterX + starRadius * Math.cos(angle); peripheralNode.y = starCenterY + starRadius * Math.sin(angle);
                addConnection(centralNode, peripheralNode);
            }
        }
        const busY = canvas.height * 0.7; const dedicatedBusNodes = []; const allBusParticipants = [...starCenters];
        const actualDedicatedBusNodes = Math.min(numDedicatedBusNodes, nodeCount - nodeIdx);
        for (let i = 0; i < actualDedicatedBusNodes; i++) {
             if (nodeIdx >= nodeCount) break;
             const busNode = nodes[nodeIdx++]; dedicatedBusNodes.push(busNode); allBusParticipants.push(busNode);
        }
        const busLineStartX = canvas.width * 0.15; const busLineEndX = canvas.width * 0.85;
        const busLineWidth = busLineEndX - busLineStartX; const busSpacing = dedicatedBusNodes.length > 0 ? busLineWidth / (dedicatedBusNodes.length + 1) : 0;
        dedicatedBusNodes.forEach((node, i) => { node.x = busLineStartX + busSpacing * (i + 1); node.y = busY; });
        allBusParticipants.sort((a, b) => a.x - b.x);
        for(let i = 0; i < allBusParticipants.length - 1; i++) {
            if (allBusParticipants[i] && allBusParticipants[i+1]) addConnection(allBusParticipants[i], allBusParticipants[i+1]);
        }
        updateConnectionStatus(); updateDescriptionContent(); drawNetwork();
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
        let html = `<h3>${selectedTopology || 'لم يتم اختيار توبولوجيا'}</h3>`;
        let failureInfo = '';

        switch (selectedTopology) {
            case 'التوبولوجيا الخطية (Bus)':
                html += `<p>🚌 تتصل جميع الأجهزة في الشبكة بكابل مركزي واحد (الناقل أو العمود الفقري). تُستخدم النهايات (Terminators) في طرفي الكابل لمنع انعكاس الإشارة.</p>
                         <p><strong>المميزات:</strong> تكلفة منخفضة، سهولة التركيب.</p>
                         <p><strong>العيوب:</strong> نقطة فشل واحدة (الكابل المركزي)، احتمالية تصادم البيانات، صعوبة تحديد الأعطال، قابلية توسع محدودة.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. إذا كان الكابل الرئيسي هو المتأثر، قد تتعطل الشبكة بأكملها.`;
                break;
            case 'التوبولوجيا النجمية (Star)':
                html += `<p>⭐ تتصل كل عقدة بشكل مستقل بجهاز مركزي (موزع Hub قديمًا أو مبدل Switch حديثًا). البيانات تمر عبر الجهاز المركزي.</p>
                         <p><strong>المميزات:</strong> موثوقية عالية (فشل عقدة لا يؤثر على الباقي عادةً)، سهولة الصيانة والإدارة، أداء جيد مع المبدلات، قابلية توسع جيدة.</p>
                         <p><strong>العيوب:</strong> الاعتماد الكامل على الجهاز المركزي (نقطة فشل واحدة)، تكاليف أعلى من الخطية بسبب الكابلات والجهاز المركزي.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. ${affectedNode.isCentral ? '<strong>فشل حرج:</strong> الجهاز المركزي معطل، الشبكة بأكملها تتوقف.' : 'عقدة طرفية معزولة، باقي الشبكة تعمل.'}`;
                break;
            case 'التوبولوجيا الدائرية (Ring)':
                html += `<p>🔄 يتم توصيل كل جهاز بجهازين آخرين، مكونة حلقة مغلقة. تنتقل البيانات عادة في اتجاه واحد. تستخدم آلية "تمرير التوكن" (Token Passing) للتحكم في الوصول ومنع التصادمات، حيث يمتلك الجهاز الذي يحمل التوكن حق الإرسال.</p>
                         <p><strong>المميزات:</strong> عدم حدوث تصادمات (بسبب تمرير التوكن)، أداء مستقر تحت الحمل الثابت.</p>
                         <p><strong>العيوب:</strong> حساسية عالية للأعطال (في الحلقة الأحادية، فشل كابل أو جهاز يوقف الشبكة)، صعوبة تشخيص الأخطاء.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. الاتصالات عبر هذه العقدة معطلة، مما قد يكسر الحلقة ويتسبب في توقف الشبكة إذا كانت حلقة أحادية.`;
                break;
            case 'التوبولوجيا الشبكية (Mesh - Full)':
                html += `<p>🕸️ في التوبولوجيا الشبكية الكاملة، تكون كل عقدة متصلة مباشرة بجميع العقد الأخرى. توفر مسارات متعددة للبيانات.</p>
                         <p><strong>المميزات:</strong> أعلى درجات الموثوقية وتحمل الأخطاء (مسارات بديلة)، توزيع جيد للحمل.</p>
                         <p><strong>العيوب:</strong> تكاليف مرتفعة جداً (عدد كبير من الكابلات والواجهات)، تعقيد كبير في الإعداد والصيانة.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. فقط هذه العقدة واتصالاتها المباشرة تتأثر. الشبكة تستمر بالعمل عبر المسارات الأخرى.`;
                break;
            case 'التوبولوجيا الشجرية (Tree)':
                html += `<p>🌳 بنية هرمية، حيث توجد عقدة رئيسية (Root Node) في القمة، وتتفرع منها عقد فرعية (Child Nodes). يمكن أن تجمع بين خصائص النجمية والخطية (الفروع كنجمية، والاتصال بينها كخطية).</p>
                         <p><strong>المميزات:</strong> قابلية توسع عالية جداً، هيكل منظم يسهل تحديد المشاكل، عزل جزئي للأعطال (فشل فرع لا يؤثر على الباقي، ما لم يكن الجذر).</p>
                         <p><strong>العيوب:</strong> اعتماد كبير على العقدة الرئيسية (فشلها قد يوقف الشبكة)، تعقيد في التصميم، تكاليف أعلى.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. ${affectedNode.isCentral && nodes.indexOf(affectedNode) === 0 ? '<strong>فشل حرج:</strong> العقدة الجذرية معطلة، قد تنهار الشبكة بالكامل.' : 'هذه العقدة وأي فروع سفلية تابعة لها قد تكون معزولة.'}`;
                break;
            case 'التوبولوجيا المختلطة (Star-Bus-Star)':
                html += `<p>🔗 تنتج عن دمج نوعين أو أكثر من التوبولوجيات الأساسية لتحقيق توازن بين الأداء، التكلفة، والموثوقية. هذا المثال يوضح دمج توبولوجيات نجمية متصلة عبر ناقل مركزي (Bus).</p>
                         <p><strong>المميزات:</strong> مرونة عالية في التصميم، تحسين الأداء العام، سهولة عزل الأعطال ضمن وحدات فرعية.</p>
                         <p><strong>العيوب:</strong> تصميم معقد يتطلب خبرة، تكاليف مرتفعة نسبيًا، صعوبة في الإدارة بدون أدوات متقدمة.</p>`;
                if (affectedNode) failureInfo = `العقدة ${affectedNode.id} معطلة. يعتمد التأثير على دور العقدة: هل هي طرفية في نجمة، أم مركز نجمة، أم جزء من الناقل المركزي.`;
                break;
            default:
                html = `<h2>الوصف والمعلومات</h2>
                        <p>مرحباً بك! هذا الدليل يقدم نظرة شاملة على توبولوجيات الشبكات المختلفة. اختر نوع التوبولوجيا وعدد العقد، ثم انقر على الزر المقابل لعرضها. يمكنك النقر على أي عقدة في الرسم لمحاكاة فشلها ومعرفة تأثير ذلك على الشبكة. عندما تكون مستعداً، انقر على "ابدأ الاختبار" لاختبار معلوماتك.</p>`;
                break;
        }
        if (failureInfo) {
            html += `<p style="margin-top: 10px; padding: 8px; background-color: #ffebee; border: 1px solid #e57373; border-radius: 4px; color: #c62828;"><em><strong>محاكاة الفشل:</strong> ${failureInfo}</em></p>`;
        } else if (selectedTopology && selectedTopology !== 'لم يتم اختيار توبولوجيا') {
            html += `<p style="margin-top: 10px;"><em>انقر على أي عقدة لمحاكاة فشلها.</em></p>`;
        }
        descriptionDiv.innerHTML = html;
    }

    // --- Reset Function ---
    function resetVisualization() {
        nodes = []; connections = []; failedNodes.clear(); selectedTopology = null; clearCanvas();
        nodeCountInput.value = 5; nodeCount = 5; updateDescriptionContent();
        ctx.fillStyle = '#7f8c8d'; ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText("مرحباً بك! اختر توبولوجيا لعرضها أو ابدأ الاختبار.", canvas.width / 2, canvas.height / 2);
    }

    // --- Quiz Functionality ---
    function showQuiz() { resetQuizState(); quizContainer.classList.remove('hidden'); quizButton.textContent = 'إخفاء الاختبار 📝'; quizButton.setAttribute('aria-expanded', 'true'); quizContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    function hideQuiz() { quizContainer.classList.add('hidden'); quizButton.textContent = 'ابدأ الاختبار 📝'; quizButton.setAttribute('aria-expanded', 'false'); }
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
        quizResultsDiv.innerHTML = `نتيجتك: ${score} من ${totalQuestions}`;
        if (score === totalQuestions) { quizResultsDiv.className = 'quiz-results correct'; quizResultsDiv.innerHTML += ' - ممتاز! 🎉'; }
        else if (score >= Math.ceil(totalQuestions * 0.7)) { quizResultsDiv.className = 'quiz-results correct'; quizResultsDiv.innerHTML += ' - عمل جيد!'; }
        else if (score >= Math.ceil(totalQuestions * 0.5)) { quizResultsDiv.className = 'quiz-results so-so'; quizResultsDiv.innerHTML += ' - لا بأس، حاول مرة أخرى للمراجعة!'; }
        else { quizResultsDiv.className = 'quiz-results incorrect'; quizResultsDiv.innerHTML += ' - تحتاج إلى مراجعة أكثر!'; }
        submitQuizButton.disabled = true; quizResultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- Event Listeners ---
    nodeCountInput.addEventListener('change', () => {
        let count = parseInt(nodeCountInput.value, 10); count = Math.max(3, Math.min(15, count));
        nodeCountInput.value = count; nodeCount = count;
        if (selectedTopology) {
            const generatorMap = {
                'التوبولوجيا الخطية (Bus)': generateBus,
                'التوبولوجيا النجمية (Star)': generateStar,
                'التوبولوجيا الدائرية (Ring)': generateRing,
                'التوبولوجيا الشبكية (Mesh - Full)': generateMesh,
                'التوبولوجيا الشجرية (Tree)': generateTree,
                'التوبولوجيا المختلطة (Star-Bus-Star)': generateHybrid
            };
            const regenerateFn = generatorMap[selectedTopology]; if (regenerateFn) regenerateFn();
        }
    });

    const generatorMap = { bus: generateBus, star: generateStar, ring: generateRing, mesh: generateMesh, tree: generateTree, hybrid: generateHybrid };
    Object.keys(topologyButtons).forEach(key => {
        const button = topologyButtons[key]; const generatorFn = generatorMap[key];
        if (button && typeof generatorFn === 'function') button.addEventListener('click', generatorFn);
        else console.error(`فشل في ربط المستمع للمفتاح: '${key}'.`);
    });

    canvas.addEventListener('click', handleCanvasClick);
    resetButton.addEventListener('click', resetVisualization);
    quizButton.addEventListener('click', toggleQuiz);
    submitQuizButton.addEventListener('click', submitQuiz);
    closeQuizButton.addEventListener('click', hideQuiz);

    // --- Initial Setup ---
    resetVisualization();
});