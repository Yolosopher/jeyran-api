import axios from "axios";
import { AVATARS_URL } from "../constants";

class AvatarService {
  constructor() {}
  public async createAvatar(username: string) {
    try {
      const { data } = await axios.request({
        url: AVATARS_URL,
        method: "post",
        headers: {
          Authorization: "Bearer " + process.env.AVATARS_SECRET,
        },
        data: {
          username,
        },
      });
      if (data) {
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  public async deleteAvatar(username: string) {
    try {
      const { data } = await axios.request({
        url: AVATARS_URL,
        method: "delete",
        headers: {
          Authorization: "Bearer " + process.env.AVATARS_SECRET,
        },
        data: {
          username,
        },
      });
      if (data) {
        return true;
      }
    } catch (error) {
      return false;
    }
  }
}

const avatarService = new AvatarService();
export default avatarService;
