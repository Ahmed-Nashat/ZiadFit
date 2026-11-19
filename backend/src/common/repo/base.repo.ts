import { isValidObjectId, Model, Types } from "mongoose";
import { exceptions } from "../exceptions/index.js";
import type { IPgginate } from "../interface/paggination.interface.js";
import type {
  ApplyBasicCreateCasting,
  DeepPartial,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  Require_id,
  UpdateQuery,
  UpdateWriteOpResult,
  CreateOptions,
} from "mongoose";

type createObject<TRawDocType> = DeepPartial<
  ApplyBasicCreateCasting<Require_id<TRawDocType>>
>;

export default class BaseRepo<TRawDocType> {
  constructor(protected model: Model<TRawDocType>) {
  }

  // -------------------- CREATE ---------------------
  // create method signatures
  // first signature
  async create({
    data,
  }: {
    // parameters data types
    data: createObject<TRawDocType>;
  }): Promise<HydratedDocument<TRawDocType>>;

  // second signature
  async create({
    data,
    options,
  }: {
    // parameters data types
    data: createObject<TRawDocType>[];
    options?: CreateOptions & { aggregateErrors?: false };
  }): Promise<HydratedDocument<TRawDocType>[]>;

  // main function
  async create({
    data,
    options,
  }: {
    // parameters data types
    data: createObject<TRawDocType> | createObject<TRawDocType>[];
    options?: CreateOptions & { aggregateErrors?: false };
  }): Promise<HydratedDocument<TRawDocType> | HydratedDocument<TRawDocType>[]> {
    if (Array.isArray(data)) {
      return this.model.create(data as createObject<TRawDocType>[], options);
    }
    return this.model.create(data);
  }

  // -------------------- FINDERS --------------------
  async paggination({
    filter = {},
    projection,
    options = {},
    page = 1,
    limit = 10,
    select,
  }: {
    filter?: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType>;
    options?: QueryOptions<TRawDocType>;
    page?: number;
    limit?: number;
    select?: string | readonly string[];
  }): Promise<IPgginate<HydratedDocument<TRawDocType>>> {
    const skip = Math.max(0, (page - 1) * limit);
    const data = this.model.find(filter, projection, options).limit(limit);

    if (skip) data.skip(skip);
    if (options?.sort) data.sort(options.sort);
    if (select) data.select(select);

    const [result, count] = await Promise.all([
      data.exec(),
      this.model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(count / limit) || 1;
    const hasNextPage = page < totalPages;

    return {
      data: result as HydratedDocument<TRawDocType>[],
      meta: {
        count,
        totalPages,
        currenPage: page,
        hasNextPage,
        hasPreviousPage: page > 1,
      },
    };
  }

  async countDocument({
    filter,
    options,
  }: {
    filter: QueryFilter<TRawDocType>;
    options?: Parameters<Model<TRawDocType>["countDocuments"]>[1];
  }): Promise<number> {
    return this.model.countDocuments(filter, options);
  }

  async findOne({
    filter = {},
    projection,
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType>;
    options?: QueryOptions<TRawDocType>;
    // FlattenMaps works as lean
  }): Promise<HydratedDocument<TRawDocType> | FlattenMaps<TRawDocType> | null> {
    const query = this.model.findOne(filter, projection, options);
    if (options?.populate) {
      query?.populate(options.populate as PopulateOptions[]);
    }
    if (options?.lean) {
      // to remove the virtuals fields
      query?.lean(options.lean);
    }
    return query.exec();
  }

  async find({
    filter = {},
    projection,
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    projection?: ProjectionType<TRawDocType>;
    options?: QueryOptions<TRawDocType>;
    // FlattenMaps works as lean
  }): Promise<
    (HydratedDocument<TRawDocType> | FlattenMaps<TRawDocType>)[]
  > {
    const query = this.model.find(filter, projection, options);
    if (options?.populate) {
      query?.populate(options.populate as PopulateOptions[]);
    }
    if (options?.lean) {
      // to remove the virtuals fields
      query?.lean(options.lean);
    }
    return query.exec();
  }

  async findById({
    id,
    select = "",
  }: {
    id: Types.ObjectId;
    select?: string | readonly string[];
  }): Promise<HydratedDocument<TRawDocType> | null> {
    if (!isValidObjectId(id)) {
      throw new exceptions.BadRequestException("Invalid ID");
    }
    return await this.model.findById(id).select(select);
  }

  // -------------------- UPADTE ---------------------
  async updateOne({
    filter = {},
    update = {},
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    update: UpdateQuery<TRawDocType>;
    options?: Parameters<Model<TRawDocType>["updateOne"]>[2];
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateOne(filter, update, options);
  }

  async updateMany({
    filter = {},
    update = {},
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    update: UpdateQuery<TRawDocType>;
    options?: Parameters<Model<TRawDocType>["updateMany"]>[2];
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateMany(filter, update, options);
  }

  async findByIdAndUpdate({
    id,
    update = {},
    options = { new: true },
  }: {
    id: Types.ObjectId;
    update?: UpdateQuery<TRawDocType>;
    options?: QueryOptions<TRawDocType> | null;
  }): Promise<HydratedDocument<TRawDocType> | null> {
    if (!isValidObjectId(id)) {
      throw new exceptions.BadRequestException("Invalid ID");
    }
    return await this.model.findByIdAndUpdate(id, update, options);
  }

  async findOneAndUpdate({
    filter,
    update = {},
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    update?: UpdateQuery<TRawDocType>;
    options?: QueryOptions<TRawDocType> | null;
  }) {
    return await this.model.findOneAndUpdate(filter, update, {
      ...options,
      returnDocument: "after",
    });
  }

  // -------------------- DELETE ---------------------
  async findByIdAndDelete({
    id,
    options = {},
  }: {
    id: Types.ObjectId;
    options?: QueryOptions;
  }) {
    if (!isValidObjectId(id)) {
      throw new exceptions.BadRequestException("Invalid ID");
    }
    return await this.model.findByIdAndDelete(id, options);
  }

  async deleteOne({
    filter = {},
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    options?: Parameters<Model<TRawDocType>["deleteOne"]>[1];
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter, options);
  }

  async deleteMany({
    filter = {},
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    options?: Parameters<Model<TRawDocType>["deleteMany"]>[1];
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter, options);
  }

  async findOneAndDelete({
    filter,
    options = {},
  }: {
    filter: QueryFilter<TRawDocType>;
    options?: QueryOptions<TRawDocType> | null;
  }) {
    return await this.model.findOneAndDelete(filter, options);
  }
}
