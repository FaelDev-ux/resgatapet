import { db } from "./firebase.js";
import { collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const COLLECTION_NAME = "users";


// Tipos de usuário:
// - user: Usuário comum, pode registrar denúncias
// - volunteer: Voluntário, pode visualizar denúncias e ajudar no resgate
// - moderator: Moderador, pode editar status de denúncias
// - admin: Administrador, pode gerenciar usuários e tudo

const users = {
  /**
   * Busca todos os usuários no Firestore
   * @returns {Promise<Array>} Lista de usuários
   */
  getAll: async function() {
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
   * Salva um novo usuário no Firestore
   * @param {Object} userData Dados do usuário
   */
  save: async function(userData) {
    try {
      const newUser = {
        email: userData.email,
        role: userData.role || 'user',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newUser);
      console.log("Usuário salvo com ID:", docRef.id);
      
      return { id: docRef.id, ...newUser };
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      throw error;
    }
  },

  /**
   * Atualiza o role de um usuário no Firestore
   * @param {String} id ID do documento no Firebase
   * @param {String} newRole Novo role
   */
  updateRole: async function(id, newRole) {
    try {
      const userRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(userRef, {
        role: newRole
      });
      console.log("Role atualizado com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      return false;
    }
  }
};

window.users = users; //jogando o obj pro escopo global também
export { users };