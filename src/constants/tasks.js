import { ACTIVE_PROVINCE_KEY } from './provinceDashboard'

const JIANGXI_TASKS = [
  { id: '1', content: '2015年赣州市信丰县的GDP约为153亿元' },
  { id: '2', content: '九江市武宁县的平均工资在2020-2023年持续增长' },
  { id: '3', content: '2017年萍乡市内的所有区县中，芦溪县的工业企业数量是最多的' },
  { id: '4', content: '2022年人口越多的区县，其当年的工业企业数量通常也越多' },
  { id: '5', content: '2019年油料产量最多的地区主要分布在江西省南部区域' },
  { id: '6', content: '2016年宜春市万载县的人口约为56万人' },
  { id: '7', content: '抚州市崇仁县的油料产量在2016-2019年持续上升' },
  { id: '8', content: '2021年鹰潭市内的所有区县中，月湖区的小学教师人数是最多的' },
  { id: '9', content: '2023年平均工资越高的区县，其当年的GDP也越高' },
  { id: '10', content: '2018年人口最多的地区主要分布在江西省北部区域' },
  { id: '11', content: '2020年上饶市铅山县的油料产量约为5000吨' },
  { id: '12', content: '新余市渝水区的GDP在2018-2021年持续增长' },
  { id: '13', content: '2023年九江市内的所有区县中，修水县的人口是最多的' },
  { id: '14', content: '2017年工业企业数量越多的地区，其当年的小学教师人数也越多' },
  { id: '15', content: '2021年GDP最高的地区主要集中在江西省省会' }
]

const HUNAN_TASKS = [
  { id: '1', content: '2020年邵阳市隆回县的GDP约为233亿元' },
  { id: '2', content: '怀化市溆浦县的平均工资在2017-2020年持续增长' },
  { id: '3', content: '2022年娄底市内的所有区县中，新化县的工业企业数量是最多的' },
  { id: '4', content: '2019年人口越多的区县，其当年的小学教师人数通常也越多' },
  { id: '5', content: '2021年油料产量最高的地区主要集中在湖南省省会及周边区域' }
]

const ACTIVE_TASKS = ACTIVE_PROVINCE_KEY === 'hunan' ? HUNAN_TASKS : JIANGXI_TASKS

export const TASKS = ACTIVE_TASKS
export const DEFAULT_TASK_ID = TASKS[0].id
export const TASKS_BY_ID = new Map(TASKS.map((task) => [task.id, task]))

export const getTaskById = (taskId) => TASKS_BY_ID.get(String(taskId)) || TASKS[0]

export const getTaskIndexById = (taskId) => {
  const index = TASKS.findIndex((task) => task.id === String(taskId))
  return index >= 0 ? index : 0
}

export const getNextTask = (taskId) => {
  const currentIndex = getTaskIndexById(taskId)
  return TASKS[(currentIndex + 1) % TASKS.length]
}

export const getPreviousTask = (taskId) => {
  const currentIndex = getTaskIndexById(taskId)
  return TASKS[(currentIndex - 1 + TASKS.length) % TASKS.length]
}
