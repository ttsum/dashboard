export const TASKS = [
  {
    id: '1',
    content: '2020年南昌市南昌县的GDP约为1048亿元'
  },
  {
    id: '2',
    content: '九江市修水县的平均工资在2017-2020年持续增长'
  },
  {
    id: '3',
    content: '2022年赣州市内的所有区县中，南康区的工业企业数量是最多的'
  },
  {
    id: '4',
    content: '2019年人口越多的区县，其小学教师人数通常也越多'
  },
  {
    id: '5',
    content: '2021年油料产量最高的地区主要集中在鄱阳湖周边区域'
  },
  {
    id: '6',
    content: '2023年上饶市鄱阳县的人口约为151万人'
  },
  {
    id: '7',
    content: '宜春市高安市的油料产量在2015-2018年持续增长'
  },
  {
    id: '8',
    content: '2018年景德镇市内的所有区县中，浮梁县的小学教师人数是最少的'
  },
  {
    id: '9',
    content: '2023年油料产量越高的区县，其工业企业数量也越多'
  },
  {
    id: '10',
    content: '2019年平均工资最高的地区主要分布在江西省南部区域'
  },
  {
    id: '11',
    content: '2018年抚州市南丰县的油料产量约为462吨'
  },
  {
    id: '12',
    content: '吉安市吉州区的GDP在2020-2023年持续增长'
  },
  {
    id: '13',
    content: '2017年上饶市内的所有区县中，鄱阳县的人口是最多的'
  },
  {
    id: '14',
    content: '2019年工业企业数量越多的区县，其GDP通常也越高'
  },
  {
    id: '15',
    content: '2016年小学教师人数最多的地区主要集中在江西省北部区域'
  }
]

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
