import { api } from "../../lib/api"

export async function createUser(payload:any){

  try{

    const res = await api.post("/users", payload)

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