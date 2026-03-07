import { db } from "./firebase.js";
import { collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const COLLECTION_NAME = "reports";

//obj reports com os métodos e conexões com o firebase

const reports = {
  /**
   * Busca todas as denúncias no Firestore
   * @returns {Promise<Array>} Lista de denúncias
   */
  getAll: async function() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const reportsList = [];
      
      querySnapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });
      
      return reportsList;
    } catch (error) {
      console.error("Erro ao buscar denúncias:", error);
      return [];
    }
  },

  /**
   * Salva uma nova denúncia no Firestore
   * @param {Object} reportData Dados da denúncia
   */
  save: async function(reportData) {
    try {
      const newReport = {
        type: reportData.type,
        description: reportData.description,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        image: reportData.image || '',
        status: reportData.status || 'open',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newReport);
      console.log("Denúncia salva com ID:", docRef.id);
      
      return { id: docRef.id, ...newReport };
    } catch (error) {
      console.error("Erro ao salvar denúncia:", error);
      throw error;
    }
  },

  /**
   * Atualiza o status de uma denúncia no Firestore
   * @param {String} id ID do documento no Firebase
   * @param {String} newStatus Novo status
   */
  updateStatus: async function(id, newStatus) {
    try {
      const reportRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(reportRef, {
        status: newStatus
      });
      console.log("Status atualizado com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      return false;
    }
  }
};

window.reports = reports; //jogando o obj pro escopo global também
export { reports };