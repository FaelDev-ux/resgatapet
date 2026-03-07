import { db, storage } from "./firebase.js";

var app = (function() {
  var STATUS_LABELS = {
    open: 'Aberto',
    in_progress: 'Em Progresso',
    resolved: 'Resolvido',
  };

  /**
   * Inicia a página inicial (mapa + lista)
   */
  function initIndexPage() {
    if (typeof mapModule !== 'undefined' && document.getElementById('map')) {
      mapModule.init();
    }
    var reportsList = reports.getAll();
    if (typeof mapModule !== 'undefined') {
      mapModule.updateMarkers(reportsList);
    }
    renderReportsList(reportsList);
  }

  /**
   * Renderiza a lista de denuncias
   * @param {Array} reportsList
  */

  function renderReportsList(reportsList) {
    var container = document.getElementById('reports-list');
    if (!container) return;

    if (!reportsList || reportsList.length === 0) {
      container.innerHTML = '<p class="reports-list-empty">Nenhuma denúncia registrada ainda. <a href="report.html">Registrar primeira denúncia</a></p>';
      return;
    }

    container.innerHTML = reportsList.map(function(report) {
      var statusClass = 'status-' + report.status;
      var statusLabel = STATUS_LABELS[report.status] || report.status;
      var dateStr = formatDate(report.created_at);
      return '<div class="report-card" data-id="' + report.id + '">' +
          '<p class="report-description">' + escapeHtml(report.description) + '</p>' +
          '<div class="report-meta">' +
          '<span class="report-status ' + statusClass + '">' + statusLabel + '</span>' +
          '<span>Data: ' + dateStr + '</span>' +
          '</div>' +
          '</div>';
    }).join('');
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
    var description = form.description.value.trim();
    var latitude = form.latitude.value.trim();
    var longitude = form.longitude.value.trim();
    var imageInput = document.getElementById('image');

    if (!description || !latitude || !longitude) {
      alert('Preencha descrição, latitude e longitude.');
      return;
    }

    if (imageInput && imageInput.files && imageInput.files[0]) {
      readImageAsDataURL(imageInput.files[0], function(dataUrl) {
        saveReportAndRedirect(description, latitude, longitude, dataUrl || '');
      });
    } else {
      saveReportAndRedirect(description, latitude, longitude, '');
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
  function saveReportAndRedirect(description, latitude, longitude, imageData) {
    reports.save({
      description: description,
      latitude: latitude,
      longitude: longitude,
      image: imageData,
      status: 'open'
    });
    window.location.href = 'index.html';
  }

  /**
   * Inicia a pagina do painel
   */
  function initDashboardPage() {
    var container = document.getElementById('dashboard-reports');
    if (!container) return;

    renderDashboardReports();
  }

  /**
   * Carrega as denuncias no painel
   */

  function renderDashboardReports() {
    var container = document.getElementById('dashboard-reports');
    if (!container) return;

    var reportsList = reports.getAll();
    if (!reportsList || reportsList.length === 0) {
      container.innerHTML = '<p class="dashboard-empty">Nenhuma denúncia registrada.</p>';
      return;    
  }
  container.innerHTML = reportsList.map(function(report) {
            var statusLabel = STATUS_LABELS[report.status] || report.status;
            var dateStr = formatDate(report.created_at);
            var imgHtml = report.image
                ? '<img class="dashboard-card-image" src="' + report.image + '" alt="Imagem">'
                : '';

            var options = ['open', 'in_progress', 'resolved'].map(function(s) {
                var selected = report.status === s ? ' selected' : '';
                return '<option value="' + s + '"' + selected + '>' + (STATUS_LABELS[s] || s) + '</option>';
            }).join('');

            return '<div class="dashboard-card" data-id="' + report.id + '">' +
                '<p class="dashboard-card-description">' + escapeHtml(report.description) + '</p>' +
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

  if(path.includes('index.html') || path === '/' || path.endsWith('/')) {
    console.log('index carregada');
    app.initIndexPage();
  } else if (path.includes('dashboard.html')) {
    console.log('dashboard carregada');
    app.initDashboardPage();
  } else if (path.includes('report.html')) {
    console.log('report carregada');
    app.initReportPage();
  }
});

export { app };