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
   * Mostra formulário para adicionar admin
   */
  function showAddAdminForm() {
    var email = prompt('Digite o email do novo usuário:');
    if (!email) return;

    var role = prompt('Digite o role (user, volunteer, moderator, admin):', 'user');
    if (!role) role = 'user';

    // Simples validação
    if (!email.includes('@')) {
      alert('Email inválido.');
      return;
    }

    users.save({
      email: email,
      role: role
    }).then(() => {
      alert('Usuário adicionado com sucesso!');
    }).catch(error => {
      console.error('Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário.');
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
  function initDashboardPage() {
    document.querySelector('.main-dashboard').style.display = 'block';
    var container = document.getElementById('dashboard-reports');
    if (!container) return;

    // Adicionar event listeners para filtros
    var filterType = document.getElementById('filter-type');
    var filterStatus = document.getElementById('filter-status');
    var btnAddAdmin = document.getElementById('btn-add-admin');

    if (filterType) {
      filterType.addEventListener('change', renderDashboardReports);
    }
    if (filterStatus) {
      filterStatus.addEventListener('change', renderDashboardReports);
    }
    if (btnAddAdmin) {
      btnAddAdmin.addEventListener('click', showAddAdminForm);
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
    // console.log(currentUser)
    
    if(currentUser) {
      usernameMsg.innerText += currentUser.name;
      usernameMsg.style.display = 'block';
    } else if(!currentUser) {
      usernameMsg.style.display = 'none';
      logoutBtn.style.display = 'none';
    }
    
    logoutBtn?.addEventListener('click', async () => {
      await users.logout();
      window.location.href = '/';
    })
    
  })
  });


export { app };