const fs = require('fs');
const path = require('path');

//NOTE: for requests
const axios = require('axios');
const iconv = require('iconv-lite');

//NOTE: for generate id
const uuidv1 = require('uuid/v1');

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
 */
const request = async (url) => {
  const resultBuf = await axios.get(url, {
    responseType: 'arraybuffer', 
    withCredentials: true,
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
const getValue = value => value && value[0] && value[0].textContent && value[0].textContent.split(':\n')[1]

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
  if(!link) return;
  const raw = await request(link, 'get');

  const {select, doc} = parsing(raw);
  const baseXPath = "/x:html/x:body/x:table[2]/x:tbody/x:tr/x:td[3]/x:table/x:tbody/x:tr/x:td/x:table[2]/x:tbody/x:tr/x:td[2]";
  const id = uuidv1();
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
    id,
    header: header && header[0] && header[0].textContent,
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
 * generate json file with data from arbitr site
 * @param {array} datas - array of object with description of arbitr court
 */
const generateJsonFile = async datas => {
  const finalJson = JSON.stringify(datas.map(item => ({
    model: "arbitrationСourt",
    data: {
      ...item
    }
  })), null, 4);
  const pathToSave = path.resolve('./', './arbitrationCourt.json');
  await fs.writeFile(pathToSave, finalJson, {}, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log('file created');
  });
}

/**
 * main function
 */
const app = (async () => {
  const links = await getLinks();
  const linkPromises = await parsingArbitrLinks(links);
  const datas = await Promise.all(linkPromises);
  await generateJsonFile(datas)
  return datas;
});

app();