import { auth, db } from "./firebase.js";
import {
  // signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const COLLECTION_NAME = "users";
const provider = new GoogleAuthProvider();

// Variável para armazenar o estado atual do usuário na memória durante a navegação
let currentUserData = null;

const users = {
  /**
   * Inicializa o observador de autenticação
   * @param {Function} callback Função chamada quando o estado de auth muda
   */
  initAuth: function (callback) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
          const userRef = doc(db, COLLECTION_NAME, user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            // O usuário já existe no banco, carrega os dados e a role dele
            currentUserData = {
              uid: user.uid,
              ...userSnap.data(),
            };
            console.log("Usuário Google logado. Role:", currentUserData.role);
          } else {
            // É o primeiro login deste usuário com o Google. Cria o registro no Firestore com a role padrão 'user'. Um admin precisará mudar a role dele no painel para 'volunteer' ou 'admin'.
            const newUser = {
              email: user.email,
              name: user.displayName,
              role: "user",
              created_at: new Date().toISOString(),
            };
            await setDoc(userRef, newUser); //referencia do auth do firebase e dados dele para o firestore
            currentUserData = { uid: user.uid, ...newUser };
            console.log("Novo usuário Google registrado.");
          }
      } else {
        // Se não houver usuário na sessão, limpa a memória
        currentUserData = null;
      }

      // Retorna os dados do usuário para o app.js decidir o que mostrar/esconder na tela em um futuro bem breve
      if (callback) callback(currentUserData);
    });
  },

  /**
   * Login Anônimo (usado silenciosamente para o público geral)
   */
  // loginAnonymous: async function () {
  //   try {
  //     // await signInAnonymously(auth);
  //   } catch (error) {
  //     console.error("Erro no login anônimo:", error);
  //   }
  // },

  /**
   * Login com Google (disparado ao clicar no botão de Login por voluntários/admins)
   */
  loginGoogle: async function () {
    try {
      await signInWithPopup(auth, provider);
      window.location = '/index.html'
    } catch (error) {
      console.error("Erro no login com Google:", error);
    }
  },

  /**
   * Faz o logout do usuário (voltando automaticamente para anônimo pelo onAuthStateChanged)
   */
  logout: async function () {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  },

  /**
   * Retorna os dados do usuário logado atualmente (útil para proteções de rota síncronas)
   */
  getCurrentUser: function () {
    return currentUserData;
  },

  /**
   * Busca todos os usuários no Firestore (Apenas para Admins montarem o painel)
   * @returns {Promise<Array>} Lista de usuários
   */
  getAll: async function () {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const usersList = [];

      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      return usersList;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return [];
    }
  },

  /**
   * Atualiza a role de um usuário no Firestore (Apenas para Admins)
   * @param {String} uid ID do documento no Firebase (que agora é o próprio UID do Auth)
   * @param {String} newRole Nova role ('user', 'volunteer', 'admin')
   */
  updateRole: async function (uid, newRole) {
    try {
      const userRef = doc(db, COLLECTION_NAME, uid);
      await updateDoc(userRef, {
        role: newRole,
      });
      console.log("Role atualizado com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      return false;
    }
  },
};

window.users = users; //jogando o obj pro escopo global também
export { users };
