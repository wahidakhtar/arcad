import { api } from "../../../lib/api"

export async function createMaSite(payload:any){

  try{

    const res = await api.post("/project/ma/site", payload)

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