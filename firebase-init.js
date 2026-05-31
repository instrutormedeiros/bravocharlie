/* ==========================================================================
   ARQUIVO: firebase-init.js
   Funções de autenticação, persistência de sessão e gatilho biométrico.
   ========================================================================== */

(function(){
  window.FirebaseCourse = window.FirebaseCourse || {};

  // --- 1. INICIALIZAÇÃO E PERSISTÊNCIA ---
  window.FirebaseCourse.init = function(config){
    if (!config || !window.firebase) return;
    if (!firebase.apps.length) firebase.initializeApp(config);
    window.__fbAuth = firebase.auth();
    window.__fbDB = firebase.firestore();
    
    // Mantem a senha salva pelo navegador, mas exige login ao abrir/recarregar a plataforma.
    window.__fbAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  };

  // --- 2. VALIDAÇÃO DE CPF OPERACIONAL ---
  function validarCPF(cpf) {
      cpf = cpf.replace(/[^\d]+/g,'');
      if(cpf.length != 11 || /^(\d)\1+$/.test(cpf)) return false;
      let add = 0;
      for (let i=0; i < 9; i ++) add += parseInt(cpf.charAt(i)) * (10 - i);
      let rev = 11 - (add % 11);
      if (rev == 10 || rev == 11) rev = 0;
      if (rev != parseInt(cpf.charAt(9))) return false;
      add = 0;
      for (let i = 0; i < 10; i ++) add += parseInt(cpf.charAt(i)) * (11 - i);
      rev = 11 - (add % 11);
      if (rev == 10 || rev == 11) rev = 0;
      if (rev != parseInt(cpf.charAt(10))) return false;
      return true;
  }

  // --- 3. CADASTRO DE ALUNOS (SIGN UP) ---
  window.FirebaseCourse.signUpWithEmail = async function(name, email, password, cpf, company, phone, courseType = 'BC') {
      const cleanCPF = cpf.replace(/[^\d]+/g,'');
      if (!validarCPF(cleanCPF)) {
          throw new Error("O número de CPF digitado é inválido. Verifique os dados.");
      }

      const cpfCheck = await window.__fbDB.collection('cpfs').doc(cleanCPF).get();
      if (cpfCheck.exists) {
          throw new Error("Este CPF já está cadastrado em nossa base tática.");
      }

      const cred = await window.__fbAuth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;

      const hoje = new Date();
      const trialValidade = new Date(hoje);
      trialValidade.setDate(hoje.getDate() + 30); // 30 dias de acesso padrão

      const sessionID = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const batch = window.__fbDB.batch();
      
      const userRef = window.__fbDB.collection('users').doc(user.uid);
      batch.set(userRef, {
          name: name,
          email: email,
          cpf: cleanCPF,
          phone: phone || '',
          company: (company || 'Particular').toUpperCase().trim(),
          courseType: courseType, // Define se é aluno de BC ou SP
          status: 'trial',
          planType: 'Degustação (30 dias)',
          acesso_ate: trialValidade.toISOString(),
          current_session_id: sessionID,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      const cpfRef = window.__fbDB.collection('cpfs').doc(cleanCPF);
      batch.set(cpfRef, { uid: user.uid });

      await batch.commit();
      return user;
  };

  // --- 4. ACESSO POR EMAIL E SENHA (SIGN IN) ---
  window.FirebaseCourse.signInWithEmail = async function(email, password) {
      const cred = await window.__fbAuth.signInWithEmailAndPassword(email, password);
      const user = cred.user;

      const sessionID = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await window.__fbDB.collection('users').doc(user.uid).update({
          current_session_id: sessionID,
          last_login: firebase.firestore.FieldValue.serverTimestamp(),
          last_device: navigator.userAgent
      });

      return user;
  };

  // --- 5. LOGOUT (SIGN OUT) ---
  window.FirebaseCourse.signOutUser = async function() {
      if (window.__fbAuth) {
          await window.__fbAuth.signOut();
      }
  };

  // --- 6. GATILHO DA BIOMETRIA NATIVA (WEBAUTHN API) ---
  window.FirebaseCourse.loginWithBiometrics = async function() {
      const emailInput = document.getElementById('email-input');
      const passwordInput = document.getElementById('password-input');

      if (!navigator.credentials || !window.PasswordCredential) {
          alert("Use o preenchimento automático de senha do navegador. No iPhone/Mac, ele pode liberar com Face ID ou Touch ID quando a senha estiver salva.");
          return;
      }
      
      try {
          const credential = await navigator.credentials.get({
              password: true,
              mediation: 'required'
          });

          if (!credential || !credential.id || !credential.password) {
              alert("Nenhuma senha salva foi encontrada para este site. Faça login uma vez e permita que o navegador salve a senha.");
              return;
          }

          if (emailInput) emailInput.value = credential.id;
          if (passwordInput) passwordInput.value = credential.password;
          await window.FirebaseCourse.signInWithEmail(credential.id, credential.password);
      } catch (err) {
          console.error("Erro na leitura biométrica:", err);
          alert("Não consegui acessar a senha salva. Faça login normalmente e permita que o navegador salve a senha.");
      }
  };

  // --- 7. MONITORAMENTO DE SESSÃO ATIVA (CONCURRÊNCIA) ---
  window.FirebaseCourse.checkAuth = function(onLoginSuccess){
    const loginModal = document.getElementById('name-prompt-modal');
    const loginOverlay = document.getElementById('name-modal-overlay');
    const expiredModal = document.getElementById('expired-modal');
    let unsubscribe = null;

    window.__fbAuth.onAuthStateChanged(async (user) => {
      if (user) {
        unsubscribe = window.__fbDB.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (!doc.exists) return; 
            
            const userData = doc.data();
            const hoje = new Date();
            const validade = new Date(userData.acesso_ate);

            // Validação de expiração de plano
            if (hoje > validade) {
                if(expiredModal) {
                    expiredModal.classList.add('show');
                    if(loginOverlay) loginOverlay.classList.add('show');
                }
                return; 
            }

            // Controle rígido de concorrência (derruba login duplicado)
            const localSession = localStorage.getItem('my_session_id');
            if (!localSession) {
                localStorage.setItem('my_session_id', userData.current_session_id);
                onLoginSuccess(user, userData);
            } else if (localSession !== userData.current_session_id) {
                alert("🚨 Alerta de Segurança: Esta conta foi acessada em outro dispositivo. Desconectando este terminal por segurança.");
                localStorage.removeItem('my_session_id');
                window.FirebaseCourse.signOutUser();
                window.location.reload();
            } else {
                onLoginSuccess(user, userData);
            }
        });
      } else {
        if (unsubscribe) unsubscribe();
        localStorage.removeItem('my_session_id');
        
        // Só joga a tela de login se o app ainda não tiver sido inicializado totalmente
        if (document.body.getAttribute('data-app-ready') !== 'true') {
            if(loginModal) loginModal.classList.add('show');
            if(loginOverlay) loginOverlay.classList.add('show');
        }
      }
    });
  };
})();
