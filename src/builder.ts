import axios, { AxiosInstance } from "axios";

import { Collection } from "./collection";
import { Relation } from "./relation";

export class Builder {
  collections: Collection[];
  relations: Relation[];
  directus: AxiosInstance | undefined;


  constructor() {
    this.collections = [];
    this.relations = [];
  }

  async login(baseURL: string, email: string, password: string) {
    this.directus = axios.create({ baseURL });

    const { access_token } = await this.directus.post("/auth/login", { email, password }).then(({ data: { data } }) => data);

    this.directus.defaults.headers.common = {
      Authorization: `Bearer ${access_token}`
    };
  }
  hookApi(directus: AxiosInstance) {
    this.directus = directus;
  }

  collection(name: string) {
    const collection = new Collection(this, name);
    this.collections.push(collection);
    return collection;
  }

  findCollection(collection: string) {
    return this.collections.find(({ name }) => name === collection);
  }

  findField(field: string, collection: string) {
    return this.findCollection(collection)?.findField(field);
  }

  relation(collection: string, field: string, related_collection: string | null = null) {
    const relation = new Relation(this, collection, field, related_collection);
    this.relations.push(relation);
    return relation;
  }

  render() {
    return {
      collections: this.collections.map((collection) => collection.render()),
      relations: this.relations.map((relation) => relation.render())
    };
  }

  async fetch() {
    if (!this.directus) return console.error('Directus library has not been initialized. Call `log()` or `hookApi()` first');
    const { collections, relations } = this.render();

    const then = ({ data: { data } }: { data: any }) => data;
    const error = ({ response: { data } }: { response: any }) => data;
    const directus = this.directus;

    const result = {
      collections: await directus.post("collections", collections).then(then).catch(error),

      relations: await Promise.all(
        relations.map((relation) => directus.post("relations", relation).then(then).catch(error))
      )
    };

    await directus.post("/utils/cache/clear");

    return result;
  }
}
