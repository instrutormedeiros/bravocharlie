/* course.js — Integrador para Projeto Bravo Charlie
   - Não altera index.html, style.css, app.js, data.js, quizzes.js originais.
   - Cria `questionSources` usado por app.js, apontando para 'quizzes.js'
   - Gera `moduleCategories` mínimo para popular a sidebar caso não exista.
*/

(function(){
  // Ensure moduleContent exists
  if (typeof moduleContent === 'undefined') {
    console.error('course.js: moduleContent não encontrado. Certifique-se de que data.js foi carregado.');
    window.moduleContent = {};
  }

  // Build questionSources: apontar todos os módulos para o arquivo quizzes.js unificado
  window.questionSources = window.questionSources || {};
  Object.keys(moduleContent).forEach(function(id){
    // apontar para o arquivo quizzes.js hospedado localmente
    window.questionSources[id] = 'quizzes.js';
  });

  // Provide a fallback moduleCategories if missing (groups modules into "Conteúdo")
  if (typeof moduleCategories === 'undefined') {
    window.moduleCategories = [
      {
        id: 'all',
        title: 'Conteúdo do Curso',
        modules: Object.keys(moduleContent)
      }
    ];
  }

  // Expose a simple helper to check quiz data availability (used by admin/debug)
  window.__PROJECT_BRAVO_CHARLIE = window.__PROJECT_BRAVO_CHARLIE || {};
  window.__PROJECT_BRAVO_CHARLIE.checkQuizFor = function(moduleId){
    if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA[moduleId]) return true;
    return false;
  };

})();