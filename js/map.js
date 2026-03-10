
var mapModule = (function() {
  var mainMap = null;
  var reportMap = null;
  var markers = [];
  var markersById= {};

  /**
   * inicia o mapa principal na pag inicial
   */
  function init() {
    var mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Isso são Coordenadas iniciais 
    var initialLat = -23.5505;
    var initialLng = -46.6333;

    mainMap = L.map('map').setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mainMap);
  }

  /**
   * Atualiza o mapa com marcador
   * @param {Array} reportsList Lista de denúncias
   */
  function updateMarkers(reportsList) {
    if (!mainMap) return;

    // Remove marcador antigo
    markers.forEach(marker => mainMap.removeLayer(marker));
    markers = [];
    markersById = {};

    reportsList.forEach(report => {
      if (report.latitude && report.longitude) {
        var color = getMarkerColor(report.type);
        var marker = L.circleMarker([report.latitude, report.longitude], {
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          radius: 8
        })
          .addTo(mainMap)
          .bindPopup('<strong>' + getTypeLabel(report.type) + ':</strong><br>' + report.description + '<br><strong>Status:</strong> ' + getStatusLabel(report.status));

        markers.push(marker);
        if (report.id) {
          markersById[report.id] = marker;
        }
      }
    });
  }

  /**
   * Inicia o mapa na parte de criação da denuncia
   */
  function initReportMap() {
    var mapElement = document.getElementById('map-report');
    if (!mapElement) return;

    var initialLat = -7.120354;
    var initialLng = -34.880111

    reportMap = L.map('map-report').setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(reportMap);

    var marker = null;

    reportMap.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;

      // Remove/adciona marcador
      if (marker) {
        reportMap.removeLayer(marker);
      }

      marker = L.marker([lat, lng]).addTo(reportMap);

      // Preenche os campos de latitude e longitude
      document.getElementById('latitude').value = lat.toFixed(6);
      document.getElementById('longitude').value = lng.toFixed(6);
    });
  }

  /**
   * cor do marcador baseado no tipo da denuncia
   * @param {String} type Tipo da denúncia
   * @returns {String} Cor
   */
  function getMarkerColor(type) {
    var colors = {
      animal_perdido: 'blue',
      animal_abandonado: 'orange',
      animal_ferido: 'red',
      maus_tratos: 'purple',
      outros: 'gray'
    };
    return colors[type] || 'gray';
  }

  /**
   * Retorna o label do tipo
   * @param {String} type Tipo da denúncia
   * @returns {String} Label
   */
  function getTypeLabel(type) {
    var labels = {
      animal_perdido: 'Animal Perdido',
      animal_abandonado: 'Animal Abandonado',
      animal_ferido: 'Animal Ferido',
      maus_tratos: 'Maus Tratos',
      outros: 'Outros'
    };
    return labels[type] || type;
  }

  /**
   * Retorna o label do status
   * @param {String} status Status da denúncia
   * @returns {String} Label do status
   */
  function getStatusLabel(status) {
    var labels = {
      open: 'Aberto',
      in_progress: 'Em Progresso',
      resolved: 'Resolvido'
    };
    return labels[status] || status;
  }

  /**
   * Centraliza o mapa na denuncia selecionada
   * @param {String} reportId ID da denúncia
   * @param {Number} zoom Nível de zoom
   */
  function panToReport(reportId, zoom = 15) {
    if (!mainMap || !reportId) return;
    var marker = markersById[reportId];
    if (!marker) return;

    var latLng = marker.getLatLng();
    // isso garante que a coordenada é um numero valido
    var lat = parseFloat(latLng.lat);
    var lng = parseFloat(latLng.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    
    // Usa flyTo para deixar o mapa no meio da denuncia com uma animação de voo
    mainMap.flyTo([lat, lng], zoom, { animate: true, duration: 1.0 });
    marker.openPopup();
  }

  return {
    init: init,
    updateMarkers: updateMarkers,
    initReportMap: initReportMap,
    panToReport: panToReport
  };
})();

window.mapModule = mapModule;