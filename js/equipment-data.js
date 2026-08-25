import actrosUrl from '../assets/equipment/mercedes-actros-manipulator-cutout.png?url';
import renaultUrl from '../assets/equipment/renault-premium-manipulator-cutout.png?url';
import forkliftUrl from '../assets/equipment/forklift-cutout-final.png?url';
import mazakaUrl from '../assets/equipment/mazaka-pile-driver-cutout.png?url';
import hre3000Url from '../assets/equipment/gayk-hre3000-cutout.png?url';
import hre1000Url from '../assets/equipment/gayk-hre1000-cutout.png?url';
import autograderUrl from '../assets/equipment/autograder-alpha.png?url';
import loaderUrl from '../assets/equipment/loader-2t-cutout.png?url';
import craneUrl from '../assets/equipment/crane-truck-cutout.png?url';
import dumpUrl from '../assets/equipment/dump-truck-cutout.png?url';

export const equipmentRows = [
  { id: 1, name: 'Манипулятор', model: 'Mercedes-Benz Actros', quantity: 1, organization: 'ТОО «ROSSDORCOM KZ»', group: 'actros' },
  { id: 2, name: 'Манипулятор', model: 'Mercedes-Benz Actros', quantity: 1, organization: 'ИП «Мизимбаев»', group: 'actros' },
  { id: 3, name: 'Манипулятор', model: 'Renault Premium', quantity: 1, organization: 'ИП «Мизимбаев»', group: 'renault' },
  { id: 4, name: 'Кара', model: '', quantity: 1, organization: 'ТОО «ROSSDORCOM KZ»', group: 'forklift' },
  { id: 5, name: 'Сваебойная машина', model: 'Mazaka', quantity: 3, organization: 'ТОО «ROSSDORCOM KZ»', group: 'mazaka' },
  { id: 6, name: 'Сваебойная машина', model: 'GayK HRE3000', quantity: 2, organization: 'ИП «Мизимбаев»', group: 'hre3000' },
  { id: 7, name: 'Сваебойная машина', model: 'GayK HRE1000', quantity: 1, organization: 'ТОО «ROSSDORCOM KZ»', group: 'hre1000' },
  { id: 8, name: 'Автогрейдер', model: '', quantity: 1, organization: 'ТОО «Арсенал Строй Казахстан»', group: 'autograder' },
  { id: 9, name: 'Погрузчик', model: '2 тн', quantity: 2, organization: 'ТОО «Арсенал Строй Казахстан»', group: 'loader' },
  { id: 10, name: 'Автокран', model: '', quantity: 2, organization: 'ТОО «Арсенал Строй Казахстан»', group: 'crane' },
  { id: 11, name: 'Самосвал', model: '10 тн', quantity: 2, organization: 'ТОО «Арсенал Строй Казахстан»', group: 'dump10' },
  { id: 12, name: 'Самосвал', model: '15 тн', quantity: 3, organization: 'ТОО «Арсенал Строй Казахстан»', group: 'dump15' }
];

export const equipmentGroups = [
  { id: 'actros', name: 'Манипулятор', model: 'Mercedes-Benz Actros', image: actrosUrl, sourceRows: [1, 2] },
  { id: 'renault', name: 'Манипулятор', model: 'Renault Premium', image: renaultUrl, sourceRows: [3] },
  { id: 'forklift', name: 'Кара', model: '', image: forkliftUrl, sourceRows: [4] },
  { id: 'mazaka', name: 'Сваебойная машина', model: 'Mazaka', image: mazakaUrl, sourceRows: [5] },
  { id: 'hre3000', name: 'Сваебойная машина', model: 'GayK HRE3000', image: hre3000Url, sourceRows: [6] },
  { id: 'hre1000', name: 'Сваебойная машина', model: 'GayK HRE1000', image: hre1000Url, sourceRows: [7] },
  { id: 'autograder', name: 'Автогрейдер', model: '', image: autograderUrl, sourceRows: [8] },
  { id: 'loader', name: 'Погрузчик', model: '2 тн', image: loaderUrl, sourceRows: [9] },
  { id: 'crane', name: 'Автокран', model: '', image: craneUrl, sourceRows: [10] },
  { id: 'dump10', name: 'Самосвал', model: '10 тн', image: dumpUrl, sourceRows: [11] },
  { id: 'dump15', name: 'Самосвал', model: '15 тн', image: dumpUrl, sourceRows: [12] }
];

export const totalEquipment = equipmentRows.reduce((sum, row) => sum + row.quantity, 0);

export function enrichEquipmentGroups() {
  return equipmentGroups.map((group) => {
    const rows = equipmentRows.filter((row) => group.sourceRows.includes(row.id));
    return {
      ...group,
      rows,
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      organizations: [...new Set(rows.map((row) => row.organization))]
    };
  });
}
