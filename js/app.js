import { db, storage } from "./firebase.js";
import { users } from './users.js';
import { reports } from './reports.js';

var app = (function() {
  var STATUS_LABELS = {
    open: 'Aberto',
    in_progress: 'Em Progresso',
    resolved: 'Resolvido',
  };

  var TYPE_LABELS = {
    animal_perdido: 'Animal Perdido',
    animal_abandonado: 'Animal Abandonado',
    animal_ferido: 'Animal Ferido',
    maus_tratos: 'Maus Tratos',
    outros: 'Outros'
  };

  var currentPage = 1;
  
  var currentListPage = 1;
  var itemsPerPageList = 10;

  var currentFilterDays = 'all';


  /*Filtro por data */

  function filterRecentReports(reportsList, days) {
    const now = new Date();
    return reportsList.filter(report => {
      if (!report.created_at) return false;

      const createdAt = new Date(report.created_at);
      const diffTime = Math.abs(now - createdAt);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= days;
    });
  }

  function setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        buttons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        const value = this.getAttribute('data-days');
        currentFilterDays = value === 'all' ? 'all' : parseInt(value);
        currentFilterDays = 1;
        app.initIndexPage();
      });
    });
  }

  async function initIndexPage() {
    if (typeof mapModule !== 'undefined' && document.getElementById('map')) {
      mapModule.init();
    }

    var reportsList = await reports.getAll();

    if(currentFilterDays !== 'all') {
      reportsList = filterRecentReports(reportsList, currentFilterDays);
    }

    if (typeof mapModule !== 'undefined') {
      mapModule.updateMarkers(reportsList);
    }
    renderReportsList(reportsList);
    setupFilterButtons();
  }

  /**
   * Mostra modal para gerenciar usuários
   */
  function showManageUsersForm() {
    var modal = document.getElementById('manage-users-modal');
    modal.style.display = 'block';
    renderUsersList();

    // Event listener para fechar o modal
    var closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = 'none';
      };
    }

    // Fechar modal clicando fora
    window.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  }

  /**
   * Renderiza a lista de usuários no modal
   */
  async function renderUsersList() {
    var container = document.getElementById('modal-users-list');
    if (!container) return;

    var usersList = await users.getAll();

    if (!usersList || usersList.length === 0) {
      container.innerHTML = '<p class="dashboard-empty">Nenhum usuário encontrado.</p>';
      return;
    }

    function escapeHtml(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    container.innerHTML = usersList.map(function(user) {
      var roleOptions = ['user', 'volunteer', 'moderator', 'admin'].map(function(role) {
        var selected = user.role === role ? 'selected' : '';
        return '<option value="' + role + '" ' + selected + '>' + role + '</option>';
      }).join('');

      return '<div class="user-card">' +
          '<div class="user-info">' +
          '<div class="user-name">' + escapeHtml(user.name) + '</div>' +
          '<div class="user-email">' + escapeHtml(user.email) + '</div>' +
          '</div>' +
          '<div class="user-role">' +
          '<select class="role-select" data-uid="' + user.id + '">' +
          roleOptions +
          '</select>' +
          '<button class="btn btn-primary update-role-btn" data-uid="' + user.id + '">Atualizar</button>' +
          '</div>' +
          '</div>';
    }).join('');

    // Adicionar event listeners para os botões de atualizar
    document.querySelectorAll('.update-role-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var uid = this.getAttribute('data-uid');
        var select = document.querySelector('.role-select[data-uid="' + uid + '"]');
        var newRole = select.value;

        var success = await users.updateRole(uid, newRole);
        if (success) {
          alert('Cargo atualizado com sucesso!');
        } else {
          alert('Erro ao atualizar cargo.');
        }
      });
    });
  }

  function renderReportsList(reportsList) {
    var container = document.getElementById('reports-list');
    if (!container) return;

    if (!reportsList || reportsList.length === 0) {
      container.innerHTML = '<p class="reports-list-empty">Nenhuma denúncia registrada ainda. <a href="report.html">Registrar primeira denúncia</a></p>';
      return;
    }

    function formatDate(isoString) {
      if (!isoString) return '-';
      var d = new Date(isoString);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    const start = (currentListPage - 1) * itemsPerPageList;
    const end = start + itemsPerPageList;
    const paginatedReports = reportsList.slice(start, end);

    // container.innerHTML = reportsList.map(function(report)
    container.innerHTML = paginatedReports.map(function(report) {
      var statusClass = 'status-' + report.status;
      var statusLabel = STATUS_LABELS[report.status] || report.status;
      var typeLabel = TYPE_LABELS[report.type] || report.type;
      var dateStr = formatDate(report.created_at);
      return '<div class="report-card" data-id="' + report.id + '">' +
          '<p class="report-description"><strong>' + typeLabel + ':</strong> ' + escapeHtml(report.description) + '</p>' +
          '<div class="report-meta">' +
          '<span class="report-status ' + statusClass + '">' + statusLabel + '</span>' +
          '<span>Data: ' + dateStr + '</span>' +
          '</div>' +
          '</div>';
    }).join('');

  /* pagination de denúncias */
    const totalPagesList = Math.ceil(reportsList.length / itemsPerPageList);
      let paginationHtml = '<div class="pagination">';

      paginationHtml += '<button class="btn btn-secondary prev" ' + (  currentListPage === 1 ? 'disabled' : '') + '>Anterior</button>';

      for (let i = 1; i <= totalPagesList; i++) {
        paginationHtml += '<button class="btn ' + (i === currentListPage ? 'btn-primary' : 'btn-secondary') + ' page-btn" data-page="' + i + '">' + i + '</button>';
      }

        paginationHtml += '<button class="btn btn-secondary next" ' + (currentListPage === totalPagesList ? 'disabled' : '') + '>Próximo</button>';

      paginationHtml += '</div>';

      container.innerHTML += paginationHtml;

      document.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', function() {
          currentListPage = parseInt(this.getAttribute('data-page'));
          renderReportsList(reportsList);
        });
      });

      const prevBtn = container.querySelector('.prev');
      const nextBtn = container.querySelector('.next');

      if (prevBtn) {
        prevBtn.addEventListener('click', function() {
          if (currentListPage > 1) {
            currentListPage--;
            renderReportsList(reportsList);
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          if (currentListPage < totalPagesList) {
            currentListPage++;
            renderReportsList(reportsList);
          }
        });
      }
    //quando clicar na denuncia, o mapa vai centralizar nela e vai abrir um popup
    container.querySelectorAll('.report-card').forEach(function(card) {
      card.addEventListener('click', function()
    {
      var reportId = this.getAttribute('data-id');
      if (typeof mapModule !== 'undefined' && mapModule.panToReport) {
        mapModule.panToReport(reportId);
      }
    });
    });
  }
  /**
   * inicia a pag da nova denuncia
   */

  function initReportPage() {
    var form = document.getElementById('report-form');
    var btnGeolocation = document.getElementById('btn-geolocation');
    var imageInput = document.getElementById('image');

    if (typeof mapModule !== 'undefined' && document.getElementById('map-report')) {
      mapModule.initReportMap();
    }

    if (btnGeolocation) {
      btnGeolocation.addEventListener('click', getGeolocation);
    }

    if (imageInput) {
      imageInput.addEventListener('change', function() {});
    }

    if (form) {
      form.addEventListener('submit', handleReportSubmit);
    }
  }

  /**
   * Obtem a localização atual e preenche os campos
   */

  function getGeolocation() {
    var latInput = document.getElementById('latitude');
    var lngInput = document.getElementById('longitude');
    var statusEl = document.getElementById('geolocation-status');

    function setStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'geolocation-status' + (isError ? 'geolocation-status--error' : '');
    }

    if (!navigator.geolocation) {
      setStatus('Seu navegador não suporta GeoLocalização.', true);
      return;
    }

    setStatus('Obtendo Localização...');

    var options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        if (latInput) latInput.value = lat;
        if (lngInput) lngInput.value = lng;
        if (typeof mapModule !== 'undefined' && mapModule.setReportPosition) {
          mapModule.setReportPosition(lat, lng);
        }
        setStatus('localização obtida.');
      },
      function(err) {
        var msg = 'Erro ao obter sua localização. ';
        if (err.code === 1) {
          msg += 'Permita o acesso a localização e tente novamente.';
        } else if (err.code === 2) {
          msg += 'Posição indisponivel, tente clicar no mapa para marcar o local.';
        } else if (err.code === 3) {
          msg += 'A requisição demorou. tente novamente ou clique no mapa.';
        } else {
          msg += 'Abra o site via http:// ou https:// para a localização funcionar.';
        }
        setStatus(msg, true);
      },
      options
    );
  }
  /**
   * Tratar o envio do formulario
   * @param {event} e
   */

  function handleReportSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var type = form.type.value;
    var description = form.description.value.trim();
    var latitude = form.latitude.value.trim();
    var longitude = form.longitude.value.trim();
    var imageInput = document.getElementById('image');

    if (!type || !description || !latitude || !longitude) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (imageInput && imageInput.files && imageInput.files[0]) {
      readImageAsDataURL(imageInput.files[0], function(dataUrl) {
        saveReportAndRedirect(type, description, latitude, longitude, dataUrl || '');
      });
    } else {
      saveReportAndRedirect(type, description, latitude, longitude, '');
    }
  }

  /**
  * Lê arquivo de imagem
  * @param {File} file
  * @param {Function} callback
  */
  function readImageAsDataURL(file, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      callback(reader.result);
    };
    reader.onerror = function() {
      callback('');
    };
    reader.readAsDataURL(file);
  }

  /**
  * Salvar denuncia e mandar para index
  */
  async function saveReportAndRedirect(type, description, latitude, longitude, imageData) {
    try{
      await reports.save({
        type: type,
        description: description,
        latitude: latitude,
        longitude: longitude,
        image: imageData,
        status: 'open'
      });
      window.location.href = 'index.html';
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Houve um erro ao enviar a denúncia. Tente novamente.");
    }
  }

  /**
   * Inicia a pagina do painel
   */
  function initDashboardPage(currentUser) {
    document.querySelector('.main-dashboard').style.display = 'block';
    var container = document.getElementById('dashboard-reports');
    if (!container) return;

    // Adicionar event listeners para filtros
    var filterType = document.getElementById('filter-type');
    var filterStatus = document.getElementById('filter-status');
    var btnManageUsers = document.getElementById('btn-manage-users');

    if (filterType) {
      filterType.addEventListener('change', renderDashboardReports);
    }
    if (filterStatus) {
      filterStatus.addEventListener('change', renderDashboardReports);
    }
    if (btnManageUsers && currentUser && currentUser.role === 'admin') {
      btnManageUsers.style.display = 'block';
      btnManageUsers.addEventListener('click', showManageUsersForm);
    } else if (btnManageUsers) {
      btnManageUsers.style.display = 'none';
    }

    renderDashboardReports();
  }

  /**
   * Carrega as denuncias no painel
   */

  async function renderDashboardReports() {
    var container = document.getElementById('dashboard-reports');
    var paginationContainer = document.getElementById('pagination');
    if (!container) return;

    function formatDate(isoString) {
      if (!isoString) return '-';
      var d = new Date(isoString);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    var reportsList = await reports.getAll();

    // Aplicar filtros
    var filterType = document.getElementById('filter-type')?.value || '';
    var filterStatus = document.getElementById('filter-status')?.value || '';

    if (filterType) {
      reportsList = reportsList.filter(r => r.type === filterType);
    }
    if (filterStatus) {
      reportsList = reportsList.filter(r => r.status === filterStatus);
    }

    // Reset página se filtros mudaram
    if (reportsList.length <= (currentPage - 1) * 10) {
      currentPage = 1;
    }

    if (!reportsList || reportsList.length === 0) {
      container.innerHTML = '<p class="dashboard-empty">Nenhuma denúncia encontrada com os filtros aplicados.</p>';
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;    
    }

    // Paginação
    var itemsPerPage = 10;
    var totalPages = Math.ceil(reportsList.length / itemsPerPage);
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex = startIndex + itemsPerPage;
    var paginatedReports = reportsList.slice(startIndex, endIndex);

    container.innerHTML = paginatedReports.map(function(report) {
      var statusLabel = STATUS_LABELS[report.status] || report.status;
      var typeLabel = TYPE_LABELS[report.type] || report.type;
      var dateStr = formatDate(report.created_at);
      var imgHtml = report.image
          ? '<img class="dashboard-card-image" src="' + report.image + '" alt="Imagem">'
          : '';

      var options = ['open', 'in_progress', 'resolved'].map(function(s) {
          var selected = report.status === s ? ' selected' : '';
          return '<option value="' + s + '"' + selected + '>' + (STATUS_LABELS[s] || s) + '</option>';
      }).join('');

      return '<div class="dashboard-card" data-id="' + report.id + '">' +
          '<p class="dashboard-card-description"><strong>' + typeLabel + ':</strong> ' + escapeHtml(report.description) + '</p>' +
          '<p class="dashboard-card-meta">Data: ' + dateStr + '</p>' +
          imgHtml +
          '<div class="dashboard-card-actions">' +
          '<label>Status: </label>' +
          '<select class="dashboard-status-select" data-id="' + report.id + '">' + options + '</select>' +
          '<button class="btn btn-danger delete-report-btn" data-id="' + report.id + '">Deletar</button>' +
          '</div>' +
          '</div>';
    }).join('');

    container.querySelectorAll('.dashboard-status-select').forEach(function(select) {
        select.addEventListener('change', function() {
            var id = this.getAttribute('data-id');
            var status = this.value;
            reports.updateStatus(id, status);
        });
    });

    container.querySelectorAll('.delete-report-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            var id = this.getAttribute('data-id');
            if (confirm('Tem certeza que deseja deletar esta denúncia?')) {
                var success = await reports.delete(id);
                if (success) {
                    renderDashboardReports(); // Isso aqui recarrega a lista dps de deletar
                }
            }
        });
    });

    // Renderizar paginação
    if (paginationContainer && totalPages > 1) {
      var paginationHtml = '<button class="btn btn-secondary" id="prev-page" ' + (currentPage === 1 ? 'disabled' : '') + '>Anterior</button>';
      for (var i = 1; i <= totalPages; i++) {
        paginationHtml += '<button class="btn ' + (i === currentPage ? 'btn-primary' : 'btn-secondary') + ' page-btn" data-page="' + i + '">' + i + '</button>';
      }
      paginationHtml += '<button class="btn btn-secondary" id="next-page" ' + (currentPage === totalPages ? 'disabled' : '') + '>Próximo</button>';
      paginationContainer.innerHTML = paginationHtml;

      // Event listeners para paginação
      document.getElementById('prev-page')?.addEventListener('click', function() {
        if (currentPage > 1) {
          currentPage--;
          renderDashboardReports();
        }
      });
      document.getElementById('next-page')?.addEventListener('click', function() {
        if (currentPage < totalPages) {
          currentPage++;
          renderDashboardReports();
        }
      });
      document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          currentPage = parseInt(this.getAttribute('data-page'));
          renderDashboardReports();
        });
      });
    } else if (paginationContainer) {
      paginationContainer.innerHTML = '';
    }
  }

    return {
        initIndexPage: initIndexPage,
        initReportPage: initReportPage,
        initDashboardPage: initDashboardPage
    };
  }
  
)();

/*
*   Roteador centralizado para carregar cada pág correspondente
*/

document.addEventListener('DOMContentLoaded',() => {
  const path = window.location.pathname;
  // Esconder botão de logout por padrão só mostra se o user estiver logado
  const logoutBtn = document.querySelector('.logout-btn');
  const usernameMsg = document.querySelector('.username');
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (usernameMsg) usernameMsg.style.display = 'none';

  users.initAuth(currentUser => {

    if (path.includes('dashboard.html')) {
      if(!currentUser) {
        //acesso negado
        window.location.href = '/login.html';
        return;
      } else if(currentUser.role === 'user'){
        alert('Apenas voluntários cadastrados podem acessar este painel, entre em contato com nossa coordenadora para fazer parte da equipe!')
        window.location.href = '/index.html';
      }
      app.initDashboardPage(currentUser);
    } else if (path.includes('login.html')) {
      if(currentUser && currentUser.role !== 'user') {
        window.location.href = '/dashboard.html';
        return;
      } else if(currentUser && currentUser.role === 'user'){
        alert('Você já está logado');
        window.location.href = '/index.html';
        return;
      }

      const btnGoogle = document.querySelector('#btn-login-google');
      if(btnGoogle) { btnGoogle.addEventListener('click', users.loginGoogle)}
    } else if (path.includes('report.html')) {
      app.initReportPage();
    } else {
      app.initIndexPage();
    }

    /*
    * nav dinâmica
    */
    
    const logoutBtn = document.querySelector('.logout-btn');
    const usernameMsg = document.querySelector('.username');
    const logoutBtnMobile = document.querySelector('.username-mobile .logout-btn');
    const usernameMsgMobile = document.querySelector('.username-mobile .username');
    // Esconder por padrão, só mostra se logado
    if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';
    if (usernameMsgMobile) usernameMsgMobile.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (usernameMsg) usernameMsg.style.display = 'none';

    if (currentUser) {
      if (usernameMsg) {
        usernameMsg.innerText += currentUser.name;
        usernameMsg.style.display = 'block';
      }
      if (usernameMsgMobile) {
        usernameMsgMobile.innerText += currentUser.name;
        usernameMsgMobile.style.display = 'block';
      }
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (logoutBtnMobile) logoutBtnMobile.style.display = 'block';
    }

    logoutBtn?.addEventListener('click', async () => {
      await users.logout();
      window.location.href = '/';
    })
    
    logoutBtnMobile?.addEventListener('click', async () => {
      await users.logout();
      window.location.href = '/';
    })
    
  })
  });



/**
* Nav mobile
*/

const btnHome = document.querySelector('.nav-mobile .home');
const btnDashboard = document.querySelector('.nav-mobile .dashboard');
const btnFaq = document.querySelector('.nav-mobile .faq');
const btnAbout = document.querySelector('.nav-mobile .about');
const btnReport = document.querySelector('.nav-mobile .report');

btnHome?.addEventListener('click', () => window.location.href = '/')
btnDashboard?.addEventListener('click', () => window.location.href = '/dashboard.html')
btnFaq?.addEventListener('click', () => window.location.href = '/faq.html')
btnAbout?.addEventListener('click', () => window.location.href = '/sobre.html')
btnReport?.addEventListener('click', () => window.location.href = '/report.html')

export { app };