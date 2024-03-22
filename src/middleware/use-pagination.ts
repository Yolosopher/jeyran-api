import { NextFunction, Response } from "express";

export const usePagination = (req: Req, res: Response, next: NextFunction) => {
  try {
    let page = req.query?.page ?? 1;
    let limit = req.query?.limit ?? 10;
    const search = req.query?.search ?? "";
    const sort = "-createdAt";
    let deleted = false;

    if (req.query?.deleted === "true") {
      deleted = true;
    }

    page = Number(page);
    limit = Number(limit);

    if (page < 1) {
      page = 1;
    }
    if (limit < 1) {
      limit = 10;
    }

    const payload: any = {
      search: "",
      deleted,
      page,
      limit,
      sort,
    };
    if (search) {
      payload.search = search;
    }

    req.pagination = payload;
  } catch (error) {
    req.pagination = {
      search: "",
      deleted: false,
      page: 1,
      limit: 10,
      sort: "-createdAt",
    };
  }

  next();
};
