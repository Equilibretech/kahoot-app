let questionCount = 1;
let currentQuizzes = [];

function addQuestion() {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.setAttribute('data-question', questionCount);
    
    questionCard.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${questionCount}</span>
            <button class="delete-question" onclick="deleteQuestion(${questionCount})">Supprimer</button>
        </div>
        
        <input type="text" class="question-input" placeholder="Votre question..." required>
        
        <div class="options-container">
            <div class="option-group">
                <input type="radio" name="correct-${questionCount}" value="0" class="option-radio">
                <input type="text" class="option-input" placeholder="Option A" required>
            </div>
            <div class="option-group">
                <input type="radio" name="correct-${questionCount}" value="1" class="option-radio">
                <input type="text" class="option-input" placeholder="Option B" required>
            </div>
            <div class="option-group">
                <input type="radio" name="correct-${questionCount}" value="2" class="option-radio">
                <input type="text" class="option-input" placeholder="Option C" required>
            </div>
            <div class="option-group">
                <input type="radio" name="correct-${questionCount}" value="3" class="option-radio">
                <input type="text" class="option-input" placeholder="Option D" required>
            </div>
        </div>
        
        <div class="time-limit">
            <label>Temps limite:</label>
            <input type="number" value="30" min="10" max="120">
            <span>secondes</span>
        </div>
    `;
    
    container.appendChild(questionCard);
    updateDeleteButtons();
}

function deleteQuestion(questionNum) {
    const questionCard = document.querySelector(`[data-question="${questionNum}"]`);
    if (questionCard) {
        questionCard.remove();
        updateQuestionNumbers();
        updateDeleteButtons();
    }
}

function updateQuestionNumbers() {
    const questionCards = document.querySelectorAll('.question-card');
    questionCards.forEach((card, index) => {
        const newNum = index + 1;
        card.setAttribute('data-question', newNum);
        card.querySelector('.question-number').textContent = `Question ${newNum}`;
        
        const radios = card.querySelectorAll('.option-radio');
        radios.forEach(radio => {
            radio.name = `correct-${newNum}`;
        });
        
        const deleteBtn = card.querySelector('.delete-question');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `deleteQuestion(${newNum})`);
        }
    });
    
    questionCount = questionCards.length;
}

function updateDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-question');
    deleteButtons.forEach(btn => {
        btn.style.display = questionCount > 1 ? 'block' : 'none';
    });
}

function validateQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    if (!title) {
        showError('Le titre du quiz est requis');
        return false;
    }
    
    const questionCards = document.querySelectorAll('.question-card');
    
    for (let i = 0; i < questionCards.length; i++) {
        const card = questionCards[i];
        const questionText = card.querySelector('.question-input').value.trim();
        
        if (!questionText) {
            showError(`La question ${i + 1} est requise`);
            return false;
        }
        
        const options = card.querySelectorAll('.option-input');
        for (let j = 0; j < options.length; j++) {
            if (!options[j].value.trim()) {
                showError(`Toutes les options de la question ${i + 1} sont requises`);
                return false;
            }
        }
        
        const correctRadio = card.querySelector('.option-radio:checked');
        if (!correctRadio) {
            showError(`Veuillez sélectionner la bonne réponse pour la question ${i + 1}`);
            return false;
        }
    }
    
    return true;
}

function collectQuizData() {
    const title = document.getElementById('quiz-title').value.trim();
    const description = document.getElementById('quiz-description').value.trim();
    const questionCards = document.querySelectorAll('.question-card');
    
    const questions = [];
    
    questionCards.forEach((card, index) => {
        const questionText = card.querySelector('.question-input').value.trim();
        const options = Array.from(card.querySelectorAll('.option-input')).map(input => input.value.trim());
        const correctRadio = card.querySelector('.option-radio:checked');
        const timeLimit = parseInt(card.querySelector('.time-limit input').value);
        
        questions.push({
            question: questionText,
            options: options,
            correct: parseInt(correctRadio.value),
            timeLimit: timeLimit
        });
    });
    
    return {
        title,
        description,
        questions
    };
}

async function saveQuiz() {
    if (!validateQuiz()) {
        return;
    }
    
    const quizData = collectQuizData();
    
    try {
        const response = await fetch('/api/quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        });
        
        if (response.ok) {
            const savedQuiz = await response.json();
            showSuccess('Quiz sauvegardé avec succès !');
            
            setTimeout(() => {
                resetForm();
                loadQuizzes();
            }, 2000);
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

function resetForm() {
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    
    const container = document.getElementById('questions-container');
    container.innerHTML = `
        <div class="question-card" data-question="1">
            <div class="question-header">
                <span class="question-number">Question 1</span>
                <button class="delete-question" onclick="deleteQuestion(1)" style="display: none;">Supprimer</button>
            </div>
            
            <input type="text" class="question-input" placeholder="Votre question..." required>
            
            <div class="options-container">
                <div class="option-group">
                    <input type="radio" name="correct-1" value="0" class="option-radio">
                    <input type="text" class="option-input" placeholder="Option A" required>
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-1" value="1" class="option-radio">
                    <input type="text" class="option-input" placeholder="Option B" required>
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-1" value="2" class="option-radio">
                    <input type="text" class="option-input" placeholder="Option C" required>
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-1" value="3" class="option-radio">
                    <input type="text" class="option-input" placeholder="Option D" required>
                </div>
            </div>
            
            <div class="time-limit">
                <label>Temps limite:</label>
                <input type="number" value="30" min="10" max="120">
                <span>secondes</span>
            </div>
        </div>
    `;
    
    questionCount = 1;
    updateDeleteButtons();
}

async function loadQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        const quizzes = await response.json();
        currentQuizzes = quizzes;
        displayQuizList(quizzes);
    } catch (error) {
        console.error('Erreur lors du chargement des quiz:', error);
        showError('Erreur lors du chargement des quiz');
    }
}

function displayQuizList(quizzes) {
    const container = document.getElementById('quiz-list-container');
    container.innerHTML = '';
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p>Aucun quiz créé pour le moment.</p>';
        return;
    }
    
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.style.cssText = `
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        quizCard.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">${quiz.title}</h3>
            <p style="margin: 0 0 15px 0; color: #666;">${quiz.description || 'Pas de description'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 0.9em;">
                    ${quiz.questions.length} questions • 
                    Créé le ${new Date(quiz.createdAt).toLocaleDateString()}
                </span>
                <div>
                    <button onclick="editQuiz('${quiz.id}')" style="background: #ffc107; color: #333; border: none; padding: 8px 12px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
                        Éditer
                    </button>
                    <button onclick="deleteQuiz('${quiz.id}')" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        Supprimer
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(quizCard);
    });
}

async function deleteQuiz(quizId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/${quizId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Quiz supprimé avec succès !');
            loadQuizzes();
        } else {
            const error = await response.json();
            showError(error.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

function editQuiz(quizId) {
    const quiz = currentQuizzes.find(q => q.id === quizId);
    if (!quiz) return;
    
    document.getElementById('quiz-title').value = quiz.title;
    document.getElementById('quiz-description').value = quiz.description || '';
    
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    quiz.questions.forEach((question, index) => {
        const questionNum = index + 1;
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.setAttribute('data-question', questionNum);
        
        questionCard.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${questionNum}</span>
                <button class="delete-question" onclick="deleteQuestion(${questionNum})" ${questionNum === 1 ? 'style="display: none;"' : ''}>Supprimer</button>
            </div>
            
            <input type="text" class="question-input" placeholder="Votre question..." required value="${question.question}">
            
            <div class="options-container">
                <div class="option-group">
                    <input type="radio" name="correct-${questionNum}" value="0" class="option-radio" ${question.correct === 0 ? 'checked' : ''}>
                    <input type="text" class="option-input" placeholder="Option A" required value="${question.options[0]}">
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-${questionNum}" value="1" class="option-radio" ${question.correct === 1 ? 'checked' : ''}>
                    <input type="text" class="option-input" placeholder="Option B" required value="${question.options[1]}">
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-${questionNum}" value="2" class="option-radio" ${question.correct === 2 ? 'checked' : ''}>
                    <input type="text" class="option-input" placeholder="Option C" required value="${question.options[2]}">
                </div>
                <div class="option-group">
                    <input type="radio" name="correct-${questionNum}" value="3" class="option-radio" ${question.correct === 3 ? 'checked' : ''}>
                    <input type="text" class="option-input" placeholder="Option D" required value="${question.options[3]}">
                </div>
            </div>
            
            <div class="time-limit">
                <label>Temps limite:</label>
                <input type="number" value="${question.timeLimit || 30}" min="10" max="120">
                <span>secondes</span>
            </div>
        `;
        
        container.appendChild(questionCard);
    });
    
    questionCount = quiz.questions.length;
    updateDeleteButtons();
    showQuizForm();
}

function showQuizForm() {
    document.getElementById('quiz-form').style.display = 'block';
    document.getElementById('quiz-list').style.display = 'none';
}

function showQuizList() {
    document.getElementById('quiz-form').style.display = 'none';
    document.getElementById('quiz-list').style.display = 'block';
    loadQuizzes();
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    
    setTimeout(() => {
        successDiv.classList.add('hidden');
    }, 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    updateDeleteButtons();
});