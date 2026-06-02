/**
 * Generates game/src/data/patientNameBanks.json (200+ names per region).
 * Run: node scripts/generate-patient-name-banks.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/data/patientNameBanks.json');

const BANKS = {
  ghana: {
    label: 'Ghanaian',
    title: (sex) => (sex === 'male' ? 'Mr.' : 'Mrs.'),
    femaleFirst: [
      'Ama', 'Akosua', 'Abena', 'Adwoa', 'Afia', 'Akua', 'Yaa', 'Efua', 'Esi', 'Aba',
      'Adjoa', 'Araba', 'Maame', 'Serwaa', 'Grace', 'Patience', 'Gifty', 'Lydia', 'Ruth', 'Esther',
      'Priscilla', 'Felicia', 'Vida', 'Rebecca', 'Joana', 'Naana', 'Eunice', 'Bernice', 'Georgina', 'Helena',
    ],
    maleFirst: [
      'Kwame', 'Kofi', 'Kwesi', 'Yaw', 'Kojo', 'Kwabena', 'Kweku', 'Kobina', 'Kwaku', 'Fiifi',
      'Emmanuel', 'Samuel', 'Daniel', 'Joseph', 'Michael', 'Francis', 'George', 'Isaac', 'Stephen', 'Richard',
      'Patrick', 'Eric', 'Albert', 'Benjamin', 'Charles', 'David', 'Edward', 'Felix', 'Gabriel', 'Henry',
    ],
    surnames: [
      'Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Appiah', 'Darko', 'Agyeman', 'Adjei', 'Amoah',
      'Anane', 'Antwi', 'Asiedu', 'Baffour', 'Danso', 'Frimpong', 'Kwarteng', 'Nkrumah', 'Ofori', 'Sarpong',
      'Tetteh', 'Yeboah', 'Acheampong', 'Addo', 'Adu', 'Akoto', 'Amankwah', 'Baah', 'Boadi', 'Donkor',
    ],
  },
  chinese: {
    label: 'Chinese',
    title: (sex) => (sex === 'male' ? 'Mr.' : 'Ms.'),
    femaleFirst: [
      'Mei', 'Ling', 'Wei', 'Fang', 'Yan', 'Jing', 'Hui', 'Na', 'Xiu', 'Ying',
      'Xia', 'Lan', 'Hong', 'Qin', 'Min', 'Juan', 'Ping', 'Rong', 'Shu', 'Li',
      'Xin', 'Yu', 'Zhen', 'Hua', 'Lin', 'Qi', 'Yun', 'Zhi', 'An', 'Bing',
    ],
    maleFirst: [
      'Wei', 'Jun', 'Ming', 'Lei', 'Tao', 'Gang', 'Hao', 'Long', 'Peng', 'Qiang',
      'Bin', 'Feng', 'Jian', 'Kai', 'Lin', 'Bo', 'Cheng', 'Dong', 'Yong', 'Hui',
      'Jie', 'Liang', 'Nan', 'Ping', 'Rui', 'Sheng', 'Tian', 'Xiang', 'Yang', 'Zhi',
    ],
    surnames: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
      'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
      'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Han', 'Cao', 'Deng', 'Yuan', 'Cai',
    ],
  },
  brazilian: {
    label: 'Brazilian',
    title: (sex) => (sex === 'male' ? 'Mr.' : 'Mrs.'),
    femaleFirst: [
      'Maria', 'Ana', 'Juliana', 'Fernanda', 'Camila', 'Beatriz', 'Larissa', 'Patricia', 'Amanda', 'Gabriela',
      'Mariana', 'Carolina', 'Renata', 'Aline', 'Bruna', 'Daniela', 'Luciana', 'Paula', 'Raquel', 'Vanessa',
      'Bianca', 'Claudia', 'Debora', 'Eliane', 'Fabiana', 'Helena', 'Isabela', 'Joana', 'Leticia', 'Monica',
    ],
    maleFirst: [
      'João', 'Pedro', 'Carlos', 'Lucas', 'Rafael', 'Bruno', 'Felipe', 'Gustavo', 'Diego', 'André',
      'Marcos', 'Paulo', 'Ricardo', 'Rodrigo', 'Thiago', 'Vinícius', 'Eduardo', 'Fernando', 'Gabriel', 'Henrique',
      'Antonio', 'Daniel', 'Fabio', 'Guilherme', 'Igor', 'Jorge', 'Leonardo', 'Mateus', 'Nicolas', 'Otavio',
    ],
    surnames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Ferreira', 'Rodrigues', 'Almeida', 'Lima',
      'Gomes', 'Ribeiro', 'Carvalho', 'Martins', 'Rocha', 'Dias', 'Nascimento', 'Araújo', 'Melo', 'Barbosa',
      'Cardoso', 'Correia', 'Cunha', 'Freitas', 'Lopes', 'Mendes', 'Monteiro', 'Pinto', 'Ramos', 'Teixeira',
    ],
  },
  indian: {
    label: 'Indian',
    title: (sex) => (sex === 'male' ? 'Mr.' : 'Mrs.'),
    femaleFirst: [
      'Priya', 'Ananya', 'Kavya', 'Isha', 'Neha', 'Pooja', 'Riya', 'Sneha', 'Divya', 'Lakshmi',
      'Meera', 'Nisha', 'Radha', 'Sunita', 'Asha', 'Deepa', 'Geeta', 'Kiran', 'Maya', 'Shreya',
      'Aditi', 'Bhavna', 'Chitra', 'Ekta', 'Jyoti', 'Kavita', 'Manisha', 'Rekha', 'Sarita', 'Uma',
    ],
    maleFirst: [
      'Raj', 'Amit', 'Rahul', 'Vikram', 'Arjun', 'Sanjay', 'Ravi', 'Karan', 'Nikhil', 'Suresh',
      'Anil', 'Deepak', 'Gaurav', 'Harish', 'Manoj', 'Pradeep', 'Rohit', 'Sunil', 'Varun', 'Yash',
      'Ashok', 'Dev', 'Harsh', 'Jay', 'Krishna', 'Mohan', 'Naveen', 'Pranav', 'Rakesh', 'Vivek',
    ],
    surnames: [
      'Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Iyer', 'Nair', 'Menon', 'Rao',
      'Kapoor', 'Malhotra', 'Chopra', 'Joshi', 'Mehta', 'Shah', 'Desai', 'Khan', 'Verma', 'Pillai',
      'Bose', 'Das', 'Ghosh', 'Mukherjee', 'Banerjee', 'Chatterjee', 'Agarwal', 'Bhat', 'Kulkarni', 'Saxena',
    ],
  },
  nigerian: {
    label: 'Nigerian',
    title: (sex) => (sex === 'male' ? 'Mr.' : 'Mrs.'),
    femaleFirst: [
      'Chioma', 'Adaeze', 'Ngozi', 'Amina', 'Fatima', 'Blessing', 'Grace', 'Faith', 'Joy', 'Peace',
      'Chidinma', 'Ifeoma', 'Uchechi', 'Yemi', 'Zainab', 'Halima', 'Aisha', 'Bisi', 'Dupe', 'Efe',
      'Folake', 'Hadiza', 'Ijeoma', 'Kemi', 'Lola', 'Mariam', 'Nneka', 'Ola', 'Ronke', 'Titi',
    ],
    maleFirst: [
      'Chukwuemeka', 'Emeka', 'Obinna', 'Ikenna', 'Tunde', 'Segun', 'Adebayo', 'Olumide', 'Chinedu', 'Uche',
      'Yusuf', 'Ibrahim', 'Musa', 'Oluwaseun', 'Babatunde', 'Femi', 'Kunle', 'Nnamdi', 'Chidi', 'Ifeanyi',
      'Abdullahi', 'Bello', 'Haruna', 'Sani', 'Usman', 'Wale', 'Gbenga', 'Jide', 'Kola', 'Tope',
    ],
    surnames: [
      'Okafor', 'Nwosu', 'Adeyemi', 'Bello', 'Eze', 'Okonkwo', 'Ibrahim', 'Mohammed', 'Ogunleye', 'Chukwu',
      'Danjuma', 'Garba', 'Lawal', 'Musa', 'Suleiman', 'Yakubu', 'Afolabi', 'Bakare', 'Dike', 'Emecheta',
      'Fashola', 'Igwe', 'Jibril', 'Kalu', 'Nnamani', 'Obi', 'Sadiq', 'Umeh', 'Wachuku', 'Zubairu',
    ],
  },
};

function buildNames(config, target = 200) {
  const names = [];
  let fi = 0;
  let mi = 0;
  let si = 0;
  while (names.length < target) {
    const sex = names.length % 2 === 0 ? 'female' : 'male';
    const first =
      sex === 'female'
        ? config.femaleFirst[fi++ % config.femaleFirst.length]
        : config.maleFirst[mi++ % config.maleFirst.length];
    const last = config.surnames[si++ % config.surnames.length];
    const title = config.title(sex);
    names.push({ first, last, sex, display: `${title} ${first} ${last}` });
  }
  return names;
}

const MIXED_SOURCES = ['ghana', 'chinese', 'brazilian', 'indian', 'nigerian'];

function buildMixedRegion(sourceRegions, target = 200) {
  const names = [];
  let round = 0;
  while (names.length < target) {
    for (const id of MIXED_SOURCES) {
      const list = sourceRegions[id]?.names || [];
      if (!list.length) continue;
      const entry = list[round % list.length];
      names.push({
        ...entry,
        sourceRegion: id,
      });
      if (names.length >= target) break;
    }
    round += 1;
  }
  return names;
}

const regions = {};
for (const [id, config] of Object.entries(BANKS)) {
  regions[id] = { id, label: config.label, count: 200, names: buildNames(config, 200) };
}

regions.mixed = {
  id: 'mixed',
  label: 'Mixed (NYC / multicultural)',
  description: 'Each case draws from a rotating regional pool — like a diverse city ED.',
  count: 200,
  names: buildMixedRegion(regions, 200),
};

const payload = {
  version: 2,
  defaultRegion: 'ghana',
  generatedAt: new Date().toISOString(),
  regions,
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote name banks: ${Object.keys(regions).join(', ')} (${Object.keys(regions).length} regions, 200 each)`);
