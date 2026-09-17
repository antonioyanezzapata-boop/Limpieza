import { useEffect, useState } from 'react'
import * as areasApi from '../../api/areas'
import * as usersApi from '../../api/users'
import type { Area, AdminUser } from '../../api/types'

/** Loads the areas and users lists once, used to populate report filter dropdowns. */
export function useReportFilterOptions() {
  const [areas, setAreas] = useState<Area[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [areaList, userList] = await Promise.all([
          areasApi.listAreas({ status: 'ACTIVE' }),
          usersApi.listUsers({ status: 'ACTIVE' }),
        ])
        if (!cancelled) {
          setAreas(areaList)
          setUsers(userList)
        }
      } catch {
        // filters remain empty; the report itself will still load
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { areas, users }
}
