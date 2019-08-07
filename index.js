//NOTE: for requests
const axios = require('axios');
const http = require('http')
const iconv = require('iconv-lite');
//NOTE: for parse html
const xpath = require('xpath');
const parse5 = require('parse5');
const xmlser = require('xmlserializer');
const dom = require('xmldom').DOMParser;
//NOTE: base url to arbitr site
const baseURL = 'http://www.arbitr.ru';

/**
 * function for request
 * @param {string} url - request url
 * @param {string} method  - request type
 */
const request = async (url, method) => {
  const resultBuf = await axios({
    method,
    url,
    responseType: 'arraybuffer', 
  });
  const result = await iconv.decode(resultBuf.data, 'win1251')
  
  return result;
}

/**
 * this is function for formating html-string to xhtml
 * @param {string} raw - html-string
 */
const parsing = ((raw) => {
  const document = parse5.parse(raw);
  const xhtml = xmlser.serializeToString(document);
  const doc = new dom().parseFromString(xhtml);
  const select = xpath.useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
  return {select, doc};
});

/**
 * generate array list of url to arbitr info
 */
const getLinks = (async () => {
  const raw = await request(`${baseURL}/as/subj/`, 'get');
  const {select, doc} = parsing(raw);

  const nodes = select("//x:a[contains(@class, 'zag21')]/@href", doc);
  return nodes.map(item => `${baseURL}${item.value}`)
});

/**
 * get content from tag
 * @param {object} value - tag after parsing
 */
const getValue = value => value && value[0] && value[0].textContent

/**
 * function for parsing all links
 * @param {array} links - links to arbitr information
 */
const parsingArbitrLinks = (links) => links.map(link => parsingLink(link))

/**
 * parsing arbitr link and get all information
 * @param {string} link 
 */
const parsingLink = async (link) => {
  const raw = await request(link, 'get');
  const {select, doc} = parsing(raw);
  const baseXPath = "/x:html/x:body/x:table[2]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr/x:td/x:table[2]/x:tbody/x:tr/x:td[2]";
  const header = select(`${baseXPath}/x:h1`, doc);
  const address = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[2]`, doc);
  const timeZone = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[3]`, doc);
  const arbitrCode = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[4]`, doc);
  const phone = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[5]`, doc);
  const fax = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[6]`, doc);
  const email = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[7]`, doc);
  const site = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[8]`, doc);
  const mainMan = select(`${baseXPath}/x:table[3]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr[9]`, doc);
  
  return {
    header: getValue(header),
    address: getValue(address),
    timeZone: getValue(timeZone),
    arbitrCode: getValue(arbitrCode),
    phone: getValue(phone),
    fax: getValue(fax),
    email: getValue(email),
    site: getValue(site),
    mainMan: getValue(mainMan),
  };
}

/**
 * main function
 */
const app = (async () => {
  const links = await getLinks();
  const pop = await parsingArbitrLinks([links[0], links[1]]);
  const datas = await Promise.all(pop);
  return datas;
});

app();