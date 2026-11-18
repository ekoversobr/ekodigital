/* JS Digital — rastreio e formulário
   Eventos enviados ao dataLayer (o GTM decide o que vai para GA4 e Google Ads):
   scroll_depth {percent: 50|90} · section_view {section} · cta_click {cta_section, cta_label}
   whatsapp_click {whatsapp_location: 'fixo'|'pagina', cta_section} · form_start · form_submit {user_data}
   cookie_consent {consent: 'granted'|'denied'} */

/* ====== CONFIGURAR ====== */
var ENDPOINT_PLANILHA = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT'; // termina em /exec
var DIAS_ORIGEM = 90; // por quantos dias guardar gclid e UTMs
/* ======================== */

window.dataLayer = window.dataLayer || [];
function dl(obj){ window.dataLayer.push(obj); }
function gtag(){ window.dataLayer.push(arguments); }

/* ---------- armazenamento seguro ---------- */
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

/* ---------- consentimento (LGPD + Consent Mode v2) ---------- */
(function(){
  var banner = document.getElementById('cookies');
  if(!banner) return;
  var escolha = lsGet('jsd_consent');
  if(!escolha){ banner.classList.add('ativo'); }
  function aplicar(valor){
    gtag('consent','update',{
      ad_storage:valor, ad_user_data:valor, ad_personalization:valor, analytics_storage:valor
    });
    lsSet('jsd_consent', valor);
    dl({event:'cookie_consent', consent:valor});
    banner.classList.remove('ativo');
  }
  banner.querySelector('.ck-aceitar').addEventListener('click', function(){ aplicar('granted'); });
  banner.querySelector('.ck-recusar').addEventListener('click', function(){ aplicar('denied'); });
})();

/* ---------- origem: gclid, UTMs, página ---------- */
var CHAVES = ['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
(function(){
  var p = new URLSearchParams(location.search);
  var tem = CHAVES.some(function(k){ return p.get(k); });
  if(tem){
    var dados = {};
    CHAVES.forEach(function(k){ dados[k] = p.get(k) || ''; });
    dados.landing = location.href.split('#')[0];
    dados.expira = Date.now() + DIAS_ORIGEM*864e5;
    lsSet('jsd_origem', JSON.stringify(dados));
  }
  if(!lsGet('jsd_referrer') && document.referrer){ lsSet('jsd_referrer', document.referrer); }
})();
function origem(){
  try{
    var d = JSON.parse(lsGet('jsd_origem') || '{}');
    if(d.expira && d.expira < Date.now()) return {};
    return d;
  }catch(e){ return {}; }
}

/* ---------- seção de origem de um elemento ---------- */
function secaoDe(el){
  var s = el.closest('[data-secao]');
  return s ? s.getAttribute('data-secao') : 'desconhecida';
}

/* ---------- cliques em CTA e WhatsApp ---------- */
document.addEventListener('click', function(ev){
  var a = ev.target.closest('a,button');
  if(!a) return;
  var secao = secaoDe(a);
  var href = a.getAttribute('href') || '';
  if(href.indexOf('wa.me') > -1 || href.indexOf('whatsapp.com') > -1){
    var local = a.classList.contains('zap-fixo') ? 'fixo' : 'pagina';
    dl({event:'whatsapp_click', whatsapp_location:local, cta_section:secao});
  }
  if(a.hasAttribute('data-cta')){
    dl({event:'cta_click', cta_section:secao, cta_label:a.getAttribute('data-cta')});
  }
});

/* ---------- scroll 50% e 90% ---------- */
(function(){
  var marcos = {50:false, 90:false};
  function medir(){
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    if(total <= 0) return;
    var pct = (h.scrollTop || document.body.scrollTop) / total * 100;
    [50,90].forEach(function(m){
      if(!marcos[m] && pct >= m){ marcos[m] = true; dl({event:'scroll_depth', percent:m}); }
    });
  }
  window.addEventListener('scroll', medir, {passive:true});
})();

/* ---------- visualização de seção ---------- */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var vistas = {};
  var io = new IntersectionObserver(function(entradas){
    entradas.forEach(function(e){
      var nome = e.target.getAttribute('data-secao');
      if(e.isIntersecting && !vistas[nome]){
        vistas[nome] = true;
        dl({event:'section_view', section:nome});
        io.unobserve(e.target);
      }
    });
  }, {threshold:0.4});
  document.querySelectorAll('section[data-secao]').forEach(function(s){ io.observe(s); });
})();

/* ---------- formulário ---------- */
(function(){
  var f = document.getElementById('form-lead');
  if(!f) return;
  var iniciou = false;
  f.addEventListener('focusin', function(){
    if(!iniciou){ iniciou = true; dl({event:'form_start', cta_section:secaoDe(f)}); }
  });

  // máscara simples de WhatsApp: (83) 99999-9999
  var tel = f.querySelector('[name="whatsapp"]');
  tel.addEventListener('input', function(){
    var d = tel.value.replace(/\D/g,'').slice(0,11);
    var out = d;
    if(d.length > 2) out = '(' + d.slice(0,2) + ') ' + d.slice(2);
    if(d.length > 7) out = '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
    tel.value = out;
  });

  // preencher ocultos
  function preencherOcultos(){
    var o = origem();
    CHAVES.forEach(function(k){ var c = f.querySelector('[name="'+k+'"]'); if(c) c.value = o[k] || ''; });
    f.querySelector('[name="pagina_origem"]').value = o.landing || location.href.split('#')[0];
    f.querySelector('[name="referrer"]').value = lsGet('jsd_referrer') || '';
  }
  preencherOcultos();

  f.addEventListener('submit', function(ev){
    ev.preventDefault();
    var erro = f.querySelector('.erro');
    var digitos = tel.value.replace(/\D/g,'');
    if(!f.checkValidity()){
      erro.textContent = 'Preencha todos os campos.'; erro.style.display = 'block'; f.reportValidity(); return;
    }
    if(digitos.length < 10){
      erro.textContent = 'Confira o WhatsApp com DDD.'; erro.style.display = 'block'; tel.focus(); return;
    }
    erro.style.display = 'none';
    preencherOcultos();
    var botao = f.querySelector('button[type="submit"]');
    botao.disabled = true; botao.textContent = 'Enviando...';

    var dados = new URLSearchParams(new FormData(f));
    dados.append('enviado_em', new Date().toISOString());

    // conversões otimizadas: telefone em formato E.164
    dl({
      event:'form_submit',
      cta_section:secaoDe(f),
      ja_investe:(f.querySelector('[name="ja_investe"]:checked')||{}).value || '',
      user_data:{ phone_number:'+55' + digitos }
    });

    var foi = false;
    function seguir(){ if(foi) return; foi = true; location.href = 'obrigado/'; }
    setTimeout(seguir, 2500);
    if(ENDPOINT_PLANILHA.indexOf('http') !== 0){
      console.warn('[JS Digital] Configure ENDPOINT_PLANILHA em assets/site.js');
      setTimeout(seguir, 400); return;
    }
    fetch(ENDPOINT_PLANILHA, {method:'POST', mode:'no-cors', body:dados})
      .then(seguir).catch(seguir);
  });
})();
