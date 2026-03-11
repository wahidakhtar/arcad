import { api } from "../../../lib/api"

export async function createMcSite(payload:any){

  try{

    const res = await api.post("/project/mc/site", payload)

    return {
      success:true,
      data:res.data
    }

  }catch(err:any){

    return {
      success:false,
      error:err.response?.data || err.message
    }

  }

}